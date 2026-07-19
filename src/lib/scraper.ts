import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export async function scrapeBookPrices(isbn: string) {
  let browser;
  const prices = {
    amazon: undefined as number | undefined,
    ebay: undefined as number | undefined,
    buyback: undefined as number | undefined,
    isMock: {
      amazon: false,
      ebay: false,
      buyback: false
    }
  };

  try {
    // Launch puppeteer in headless mode
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set a normal user agent to avoid basic blocks
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 1. Scrape AbeBooks (more permissive than eBay for headless scraping)
    try {
      await page.goto(`https://www.abebooks.com/servlet/SearchResults?kn=${encodeURIComponent(isbn)}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const priceText = await page.evaluate(() => {
        const priceElement = document.querySelector('.item-price');
        return priceElement ? priceElement.textContent : null;
      });
      
      if (priceText) {
        // e.g. "US$ 14.99"
        const match = priceText.match(/(?:US\$|[\$£€])\s*([0-9,.]+)/);
        if (match) {
          prices.ebay = parseFloat(match[1].replace(',', '')); // map to eBay slot for now
        }
      } else {
        console.error("AbeBooks priceText is null for", isbn);
      }
    } catch (e) {
      console.error("AbeBooks scrape failed", e);
    }

    // 2. Scrape BookScouter (Buyback)
    try {
      await page.goto(`https://bookscouter.com/book/${isbn}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      // BookScouter uses React, price might take a moment to load
      await page.waitForSelector('.pricing-number', { timeout: 3000 }).catch(() => {});
      
      const priceText = await page.evaluate(() => {
        // This selector is an estimate, BookScouter DOM changes
        const priceElements = document.querySelectorAll('strong, .price');
        for (const el of Array.from(priceElements)) {
          if (el.textContent?.includes('$')) return el.textContent;
        }
        return null;
      });

      if (priceText) {
        const match = priceText.match(/\$([0-9,.]+)/);
        if (match) {
          prices.buyback = parseFloat(match[1].replace(',', ''));
        }
      } else {
        console.error("BookScouter priceText is null for", isbn);
        const html = await page.content();
        console.error("BookScouter HTML snippet:", html.substring(0, 500));
      }
    } catch (e) {
      console.error("BookScouter scrape failed", e);
    }

  } catch (error) {
    console.error("Scraper overall error:", error);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  // 3. Fallback mock prices if scraping fails (for demo resilience)
  if (prices.ebay === undefined) {
    prices.ebay = parseFloat((Math.random() * (30 - 5) + 5).toFixed(2));
    prices.isMock.ebay = true;
  }
  if (prices.buyback === undefined) {
    prices.buyback = parseFloat((Math.random() * (5 - 0.5) + 0.5).toFixed(2));
    prices.isMock.buyback = true;
  }
  if (prices.amazon === undefined) {
    prices.amazon = parseFloat((prices.ebay * 1.1).toFixed(2)); // mock amazon as slightly higher than ebay
    prices.isMock.amazon = true;
  }

  return prices;
}
