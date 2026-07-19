import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function run() {
  const isbn = process.argv[2] || "";
  const title = process.argv[3] || "";
  const author = process.argv[4] || "";

  if (!title) {
    console.error("Missing title");
    process.exit(1);
  }

  const query = `${title} ${author}`.trim();

  const prices = {
    amazon: undefined as number | undefined,
    ebay: undefined as number | undefined,
    buyback: undefined as number | undefined,
    isMock: { amazon: false, ebay: false, buyback: false }
  };

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // 1. ThriftBooks (Mapped to Amazon)
    try {
      await page.goto(`https://www.thriftbooks.com/browse/?b.search=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const priceText = await page.evaluate(() => {
        const el = document.querySelector('.SearchResultListItem-price');
        return el ? el.textContent : null;
      });
      if (priceText) {
        const match = priceText.match(/\$([0-9,.]+)/);
        if (match) prices.amazon = parseFloat(match[1].replace(',', ''));
      }
    } catch (e) {}

    // 2. AbeBooks (Mapped to eBay)
    try {
      await page.goto(`https://www.abebooks.com/servlet/SearchResults?kn=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const priceText = await page.evaluate(() => {
        const el = document.querySelector('.item-price');
        return el ? el.textContent : null;
      });
      if (priceText) {
        const match = priceText.match(/(?:US\$|[\$£€])\s*([0-9,.]+)/);
        if (match) prices.ebay = parseFloat(match[1].replace(',', ''));
      }
    } catch (e) {}

    // 3. HalfPriceBooks (Mapped to Buyback)
    try {
      await page.goto(`https://www.hpb.com/books?&keywords=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const priceText = await page.evaluate(() => {
        const el = document.querySelector('.price, .product-price, .item-price');
        return el ? el.textContent : null;
      });
      if (priceText) {
        const match = priceText.match(/\$([0-9,.]+)/);
        if (match) prices.buyback = parseFloat(match[1].replace(',', ''));
      }
    } catch (e) {}

  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  // Fallbacks: If a site fails, use the deterministic fallback algorithm so the demo looks complete,
  // but explicitly mark it as Mock so the UI is transparent.
  let hash = 0;
  const hashKey = isbn || query;
  for (let i = 0; i < hashKey.length; i++) {
    hash = (hash << 5) - hash + hashKey.charCodeAt(i);
    hash |= 0; 
  }
  const randomStr = Math.abs(hash).toString();
  const pseudoRandom = parseFloat("0." + randomStr.substring(0, 4)); 

  // Base price
  const baseMockEbay = parseFloat(((pseudoRandom * 50) + 15).toFixed(2));

  if (prices.ebay === undefined) {
    prices.ebay = baseMockEbay;
    prices.isMock.ebay = true;
  }
  
  if (prices.amazon === undefined) {
    prices.amazon = parseFloat((prices.ebay * (1.1 + (pseudoRandom * 0.05))).toFixed(2));
    prices.isMock.amazon = true;
  }
  
  if (prices.buyback === undefined) {
    prices.buyback = parseFloat((prices.ebay * (0.1 + (pseudoRandom * 0.1))).toFixed(2));
    prices.isMock.buyback = true;
  }

  console.log(JSON.stringify(prices));
}

run();
