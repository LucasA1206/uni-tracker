import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export interface QuoteResult {
  ticker: string;
  price: number;
  currency: string;
  name?: string;
}

async function getUsdToAud(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD",
      { next: { revalidate: 3600 } }
    );
    const data = (await res.json()) as { rates?: { AUD?: number } };
    return data?.rates?.AUD ?? 1.5;
  } catch {
    return 1.5;
  }
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const ticker = url.searchParams.get("ticker")?.trim().toUpperCase();
  const exchange = url.searchParams.get("exchange")?.toLowerCase();

  if (!ticker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  try {
    const YahooFinance = (await import("yahoo-finance2")).default;
    const yahooFinance = new YahooFinance();
    const baseTicker = ticker.replace(/\.AX$/i, "");
    const symbol = exchange === "asx" ? `${baseTicker}.AX` : baseTicker;
    const q = await yahooFinance.quote(symbol);
    if (!q || q.regularMarketPrice == null) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }
    const price = q.regularMarketPrice;
    const currency = (q.currency as string) || "USD";
    const name = q.shortName ?? q.longName ?? undefined;

    let priceAud = price;
    if (currency === "USD") {
      const rate = await getUsdToAud();
      priceAud = price * rate;
    }

    return NextResponse.json({
      ticker: q.symbol ?? ticker,
      price,
      priceAud,
      currency,
      name,
    });
  } catch (err) {
    console.error("Quote error:", err);
    return NextResponse.json(
      { error: "Could not fetch quote" },
      { status: 502 }
    );
  }
}
