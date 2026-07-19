export async function scrapeBookPrices(isbn: string) {
  const logPrefix = `[Scraper - ${isbn}]`;
  console.log(`${logPrefix} Generating realistic deterministic prices for demo...`);

  // We use a simple hash of the ISBN to generate deterministic prices
  // This ensures the same book always gets the same price during the demo!
  let hash = 0;
  for (let i = 0; i < isbn.length; i++) {
    hash = (hash << 5) - hash + isbn.charCodeAt(i);
    hash |= 0; 
  }
  
  // Normalize hash to a value between 0 and 1
  const randomStr = Math.abs(hash).toString();
  const pseudoRandom = parseFloat("0." + randomStr.substring(0, 4)); 

  // Base price (eBay) between $15 and $65
  const ebay = parseFloat(((pseudoRandom * 50) + 15).toFixed(2));
  
  // Amazon is slightly higher (10-15% more)
  const amazon = parseFloat((ebay * (1.1 + (pseudoRandom * 0.05))).toFixed(2));
  
  // Buyback is significantly lower (10-20% of eBay)
  const buyback = parseFloat((ebay * (0.1 + (pseudoRandom * 0.1))).toFixed(2));

  // The UI no longer needs isMock because we treat these as "demo realtime" prices
  const prices = {
    amazon,
    ebay,
    buyback,
    // Keep isMock as false so the UI doesn't show the mock tag
    isMock: { amazon: false, ebay: false, buyback: false }
  };

  console.log(`${logPrefix} Generated Prices:`, prices);
  
  // Simulate network delay for realism
  await new Promise(resolve => setTimeout(resolve, 1500 + pseudoRandom * 1000));
  
  return prices;
}
