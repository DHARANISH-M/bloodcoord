// e-RaktKosh Live Pan-India Data Scraper and Ingestion Engine
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ERAKTKOSH_STATES, fetchStateEraktkosh } from '../src/utils/eraktkoshClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export { ERAKTKOSH_STATES, fetchStateEraktkosh };

// Scrape and compile pan-India dataset
export async function buildPanIndiaEraktkoshDataset() {
  console.log('--- STARTING PAN-INDIA E-RAKTKOSH DATA COMPILATION ---');
  const allBanks = [];

  for (const st of ERAKTKOSH_STATES) {
    process.stdout.write(`Fetching ${st.name} (Code ${st.code})... `);
    const banks = await fetchStateEraktkosh(st.code);
    console.log(`✓ ${banks.length} centers processed`);
    allBanks.push(...banks);
  }

  console.log(`--- TOTAL E-RAKTKOSH BLOOD CENTRES INGESTED: ${allBanks.length} ---`);

  const outDir = path.join(__dirname, '..', 'src', 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'eraktkosh_data.json');
  fs.writeFileSync(outPath, JSON.stringify(allBanks, null, 2), 'utf-8');
  console.log(`Saved compiled e-RaktKosh database to ${outPath}`);

  return allBanks;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildPanIndiaEraktkoshDataset().catch(console.error);
}
