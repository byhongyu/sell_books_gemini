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

  const logPrefix = `[Scraper - ${isbn}]`;
  console.log(`${logPrefix} Starting scrape...`);

  try {
    // Launch puppeteer in headless mode
    console.log(`${logPrefix} Launching browser...`);
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    console.log(`${logPrefix} Browser launched. Creating new page...`);
    const page = await browser.newPage();
    
    // Set a normal user agent to avoid basic blocks
    console.log(`${logPrefix} Setting user agent...`);
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 1. Scrape AbeBooks (more permissive than eBay for headless scraping)
    try {
      console.log(`${logPrefix} Navigating to AbeBooks...`);
      await page.goto(`https://www.abebooks.com/servlet/SearchResults?kn=${encodeURIComponent(isbn)}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log(`${logPrefix} AbeBooks loaded. Evaluating price...`);
      const priceText = await page.evaluate(() => {
        const priceElement = document.querySelector('.item-price');
        return priceElement ? priceElement.textContent : null;
      });
      
      console.log(`${logPrefix} AbeBooks price text found:`, priceText);
      if (priceText) {
        // e.g. "US$ 14.99"
        const match = priceText.match(/(?:US\$|[\$£€])\s*([0-9,.]+)/);
        if (match) {
          prices.ebay = parseFloat(match[1].replace(',', '')); // map to eBay slot for now
          console.log(`${logPrefix} Parsed AbeBooks price:`, prices.ebay);
        }
      } else {
        console.warn(`${logPrefix} AbeBooks priceText is null`);
      }
    } catch (e) {
      console.error(`${logPrefix} AbeBooks scrape failed:`, e);
    }

    // 2. Scrape BookScouter (Buyback)
    try {
      console.log(`${logPrefix} Navigating to BookScouter...`);
      await page.goto(`https://bookscouter.com/book/${encodeURIComponent(isbn)}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      // BookScouter uses React, price might take a moment to load
      console.log(`${logPrefix} Waiting for BookScouter pricing selector...`);
      await page.waitForSelector('.pricing-number', { timeout: 5000 }).catch(() => {
        console.log(`${logPrefix} BookScouter selector timeout.`);
      });
      
      console.log(`${logPrefix} BookScouter loaded. Evaluating price...`);
      const priceText = await page.evaluate(() => {
        // This selector is an estimate, BookScouter DOM changes
        const priceElements = document.querySelectorAll('strong, .price');
        for (const el of Array.from(priceElements)) {
          if (el.textContent?.includes('$')) return el.textContent;
        }
        return null;
      });

      console.log(`${logPrefix} BookScouter price text found:`, priceText);
      if (priceText) {
        const match = priceText.match(/\$([0-9,.]+)/);
        if (match) {
          prices.buyback = parseFloat(match[1].replace(',', ''));
          console.log(`${logPrefix} Parsed BookScouter price:`, prices.buyback);
        }
      } else {
        console.warn(`${logPrefix} BookScouter priceText is null`);
      }
    } catch (e) {
      console.error(`${logPrefix} BookScouter scrape failed:`, e);
    }

  } catch (error) {
    console.error(`${logPrefix} Scraper overall error:`, error);
  } finally {
    if (browser) {
      console.log(`${logPrefix} Closing browser...`);
      await browser.close().catch((e) => console.error(`${logPrefix} Error closing browser:`, e));
      console.log(`${logPrefix} Browser closed.`);
    }
  }

  // 3. Fallback mock prices if scraping fails (for demo resilience)
  console.log(`${logPrefix} Applying fallbacks if necessary...`);
  if (prices.ebay === undefined) {
    prices.ebay = parseFloat((Math.random() * (30 - 5) + 5).toFixed(2));
    prices.isMock.ebay = true;
    console.log(`${logPrefix} Applied mock eBay price:`, prices.ebay);
  }
  if (prices.buyback === undefined) {
    prices.buyback = parseFloat((Math.random() * (5 - 0.5) + 0.5).toFixed(2));
    prices.isMock.buyback = true;
    console.log(`${logPrefix} Applied mock buyback price:`, prices.buyback);
  }
  if (prices.amazon === undefined) {
    prices.amazon = parseFloat((prices.ebay * 1.1).toFixed(2)); // mock amazon as slightly higher than ebay
    prices.isMock.amazon = true;
    console.log(`${logPrefix} Applied mock Amazon price:`, prices.amazon);
  }

  console.log(`${logPrefix} Scrape finished. Returning prices.`);
  return prices;
}
