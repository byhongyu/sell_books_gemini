import { scrapeBookPrices } from './src/lib/scraper';

(async () => {
  console.log("Testing scrapeBookPrices...");
  const prices = await scrapeBookPrices("9780521773691", "Causality Models Reasoning and Inference", "Judea Pearl");
  console.log("Prices:", prices);
})();
