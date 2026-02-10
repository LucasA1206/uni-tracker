import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const holdings = await prisma.stockHolding.findMany({
    where: { userId: auth.userId },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(holdings);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const { ticker, exchange, shares, averagePrice, currency } = body as {
    ticker?: string;
    exchange?: string;
    shares?: number;
    averagePrice?: number;
    currency?: string;
  };

  if (!ticker || typeof ticker !== "string" || !ticker.trim()) {
    return NextResponse.json({ error: "Ticker is required" }, { status: 400 });
  }
  if (typeof shares !== "number" || shares <= 0) {
    return NextResponse.json({ error: "Valid shares is required" }, { status: 400 });
  }
  if (typeof averagePrice !== "number" || averagePrice <= 0) {
    return NextResponse.json({ error: "Valid average price is required" }, { status: 400 });
  }

  const holding = await prisma.stockHolding.create({
    data: {
      userId: auth.userId,
      ticker: ticker.trim().toUpperCase(),
      exchange: typeof exchange === "string" ? exchange.trim() || null : null,
      shares,
      averagePrice,
      currency: currency === "USD" ? "USD" : "AUD",
    },
  });

  return NextResponse.json(holding);
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || body.id == null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const existing = await prisma.stockHolding.findFirst({
    where: { id: body.id, userId: auth.userId },
  });
  if (!existing) return NextResponse.json({ error: "Holding not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.ticker === "string" && body.ticker.trim()) data.ticker = body.ticker.trim().toUpperCase();
  if (typeof body.exchange === "string") data.exchange = body.exchange.trim() || null;
  if (typeof body.shares === "number" && body.shares > 0) data.shares = body.shares;
  if (typeof body.averagePrice === "number" && body.averagePrice > 0) data.averagePrice = body.averagePrice;
  if (body.currency === "USD" || body.currency === "AUD") data.currency = body.currency;

  const holding = await prisma.stockHolding.update({
    where: { id: existing.id },
    data,
  });

  return NextResponse.json(holding);
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await prisma.stockHolding.findFirst({
    where: { id: parseInt(id, 10), userId: auth.userId },
  });
  if (!existing) return NextResponse.json({ error: "Holding not found" }, { status: 404 });

  await prisma.stockHolding.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true });
}
