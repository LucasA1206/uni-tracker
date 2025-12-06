import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const people = await prisma.person.findMany({
    where: { userId: user.userId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ people: people.map((p) => p.name) });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = body.name.trim();
  if (!name) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  }

  try {
    const person = await prisma.person.create({
      data: {
        userId: user.userId,
        name,
      },
    });

    return NextResponse.json({ person: { id: person.id, name: person.name } });
  } catch (error: any) {
    // Handle unique constraint violation (duplicate name for user)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Person already exists" }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Name parameter is required" }, { status: 400 });
  }

  const person = await prisma.person.findFirst({
    where: { userId: user.userId, name },
  });

  if (!person) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  await prisma.person.delete({ where: { id: person.id } });

  return NextResponse.json({ success: true });
}

