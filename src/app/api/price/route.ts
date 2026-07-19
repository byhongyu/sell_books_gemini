import { NextResponse } from "next/server";
import { scrapeBookPrices } from "@/lib/scraper";

export async function POST(req: Request) {
  try {
    const { title, author } = await req.json();
    console.log(`[API /price] Request received for: "${title}"`);

    if (!title) {
      return NextResponse.json({ error: "Missing title" }, { status: 400 });
    }

    // 1. Get ISBN from Google Books API
    const query = encodeURIComponent(`intitle:${title} inauthor:${author || ""}`);
    const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
    const gbData = await gbRes.json();
    
    let isbn = "";
    if (gbData.items && gbData.items.length > 0) {
      const identifiers = gbData.items[0].volumeInfo.industryIdentifiers;
      if (identifiers) {
        const isbn13 = identifiers.find((i: any) => i.type === "ISBN_13");
        const isbn10 = identifiers.find((i: any) => i.type === "ISBN_10");
        isbn = isbn13 ? isbn13.identifier : (isbn10 ? isbn10.identifier : "");
      }
    }

    // 2. Scrape Prices
    let prices = {
      amazon: undefined as number | undefined,
      ebay: undefined as number | undefined,
      buyback: undefined as number | undefined,
    };

    // Even if ISBN is not found, try to scrape (e.g. eBay works by title) or return mock fallback
    console.log(`[API /price] Triggering scraper for "${isbn || title}"...`);
    prices = await scrapeBookPrices(isbn || "", title, author);

    // Calculate suggested price: Max of all, or default
    const validPrices = [prices.amazon, prices.ebay, prices.buyback].filter((p): p is number => p !== undefined);
    const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
    
    // Simple logic: if buyback is high, maybe just match it. If eBay is highest, maybe list for 10% less to sell fast.
    const suggestedPrice = maxPrice > 0 ? Number((maxPrice * 0.9).toFixed(2)) : undefined;

    return NextResponse.json({
      isbn,
      prices,
      suggestedPrice
    });
  } catch (error: any) {
    console.error("Price fetching error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
