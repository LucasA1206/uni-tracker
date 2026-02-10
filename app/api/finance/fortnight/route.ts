import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getFortnightPeriodStart, getPreviousFortnightPeriodStart } from "@/lib/finance";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const currentStart = getFortnightPeriodStart(now);
  const previousStart = getPreviousFortnightPeriodStart(now);

  const records = await prisma.fortnightSpending.findMany({
    where: {
      userId: auth.userId,
      periodStart: { in: [currentStart, previousStart] },
    },
  });

  const current = records.find((r) => r.periodStart.getTime() === currentStart.getTime());
  const previous = records.find((r) => r.periodStart.getTime() === previousStart.getTime());

  return NextResponse.json({
    currentPeriodStart: currentStart.toISOString(),
    previousPeriodStart: previousStart.toISOString(),
    currentAmount: current?.amountSpent ?? 0,
    previousAmount: previous?.amountSpent ?? 0,
  });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const { amount, period } = body as { amount?: number; period?: "current" | "previous" };
  if (typeof amount !== "number" || amount < 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const now = new Date();
  const periodStart =
    period === "previous"
      ? getPreviousFortnightPeriodStart(now)
      : getFortnightPeriodStart(now);

  const record = await prisma.fortnightSpending.upsert({
    where: {
      userId_periodStart: { userId: auth.userId, periodStart },
    },
    create: {
      userId: auth.userId,
      periodStart,
      amountSpent: amount,
    },
    update: { amountSpent: amount },
  });

  return NextResponse.json(record);
}
