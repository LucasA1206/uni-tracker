import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const exchange = url.searchParams.get("exchange")?.toLowerCase();

  if (!q || q.length < 1) {
    return NextResponse.json({ quotes: [] });
  }

  try {
    const YahooFinance = (await import("yahoo-finance2")).default;
    const yahooFinance = new YahooFinance();
    const results = await yahooFinance.search(q);
    if (!results || !results.quotes) {
      return NextResponse.json({ quotes: [] });
    }

    type QuoteLike = { symbol?: string; shortname?: string; exchange?: string; quoteType?: string };
    const quotes = results.quotes as QuoteLike[];
    const filtered = quotes
      .filter((q) => q.symbol && q.shortname)
      .filter((q) => {
        const sym = typeof q.symbol === "string" ? q.symbol : "";
        if (exchange === "asx") return sym.endsWith(".AX");
        if (exchange === "nasdaq") return !sym.endsWith(".AX");
        return true;
      })
      .slice(0, 15)
      .map((quote) => ({
        symbol: quote.symbol ?? "",
        name: quote.shortname ?? quote.symbol ?? "",
        exchange: quote.exchange,
        type: quote.quoteType,
      }));

    return NextResponse.json({ quotes: filtered });
  } catch (err) {
    console.error("Stock search error:", err);
    return NextResponse.json({ quotes: [] });
  }
}
