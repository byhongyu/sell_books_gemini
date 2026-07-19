import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function scrapeBookPrices(isbn: string, title?: string, author?: string) {
  const logPrefix = `[Scraper - ${isbn || title}]`;
  console.log(`${logPrefix} Starting scrape via CLI...`);

  const scriptPath = path.join(process.cwd(), 'src/lib/scraper-cli.ts');
  
  try {
    const { stdout, stderr } = await execAsync(`npx tsx "${scriptPath}" "${isbn || ''}" "${title || ''}" "${author || ''}"`);
    
    if (stderr) {
      console.error(`${logPrefix} CLI Stderr:`, stderr);
    }
    
    // Find the JSON output from the stdout
    const match = stdout.match(/\{.*\}/s);
    if (match) {
      const prices = JSON.parse(match[0]);
      console.log(`${logPrefix} Parsed prices from CLI:`, prices);
      return prices;
    }
    
    throw new Error("No JSON found in stdout");
  } catch (e) {
    console.error(`${logPrefix} CLI Scrape failed:`, e);
    // Ultimate Fallback if the CLI completely crashes
    return {
      amazon: undefined,
      ebay: undefined,
      buyback: undefined,
      isMock: { amazon: true, ebay: true, buyback: true }
    };
  }
}
