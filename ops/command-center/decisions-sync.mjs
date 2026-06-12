import fs from 'node:fs';
import path from 'node:path';

const DECISIONS_URL = process.env.DECISIONS_API_URL || 'http://localhost:8787/decisions/report';
const OUTPUT = path.resolve('ops/command-center/decisions.json');

async function syncDecisions() {
  try {
    const response = await fetch(DECISIONS_URL);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    const data = await response.json();
    fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Decisions synced to ${OUTPUT}`);
  } catch (error) {
    console.error(`Failed to sync decisions: ${error.message}`);
    if (!fs.existsSync(OUTPUT)) {
      fs.writeFileSync(OUTPUT, JSON.stringify({
        status: 'error',
        action: 'get-report',
        result: { report: { evaluatedAt: new Date().toISOString(), totalProducts: 0, activeProducts: 0, flaggedProducts: 0, retiredProducts: 0, totalPotentialRevenue: 0, totalMaintenanceCost: 0, recommendations: ['API not reachable'] } }
      }, null, 2), 'utf8');
      console.log('Created fallback decisions.json');
    }
  }
}

syncDecisions();
