import fs from 'node:fs';
import path from 'node:path';

function assertNumber(value, name) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Invalid number for ${name}`);
  }
}

function runScenario(input) {
  const {
    name,
    months,
    auditDealsPerMonth,
    auditPrice,
    sprintDealsPerMonth,
    sprintPrice,
    productDealsPerMonth,
    productPrice,
    newRetainersPerMonth,
    retainerMonthly,
    churnRate
  } = input;

  [
    ['months', months],
    ['auditDealsPerMonth', auditDealsPerMonth],
    ['auditPrice', auditPrice],
    ['sprintDealsPerMonth', sprintDealsPerMonth],
    ['sprintPrice', sprintPrice],
    ['productDealsPerMonth', productDealsPerMonth],
    ['productPrice', productPrice],
    ['newRetainersPerMonth', newRetainersPerMonth],
    ['retainerMonthly', retainerMonthly],
    ['churnRate', churnRate]
  ].forEach(([n, v]) => assertNumber(v, n));

  if (months <= 0) throw new Error('months must be > 0');
  if (churnRate < 0 || churnRate >= 1) throw new Error('churnRate must be in [0,1)');

  let activeRetainers = 0;
  let totalRevenue = 0;
  let totalRetainerRevenue = 0;

  for (let month = 1; month <= months; month += 1) {
    activeRetainers = Math.max(0, Math.round(activeRetainers * (1 - churnRate)));
    activeRetainers += newRetainersPerMonth;

    const oneOffRevenue =
      auditDealsPerMonth * auditPrice +
      sprintDealsPerMonth * sprintPrice +
      productDealsPerMonth * productPrice;

    const recurringRevenue = activeRetainers * retainerMonthly;
    totalRetainerRevenue += recurringRevenue;
    totalRevenue += oneOffRevenue + recurringRevenue;
  }

  return {
    name,
    months,
    projectedRevenue: totalRevenue,
    projectedMRR: activeRetainers * retainerMonthly,
    projectedActiveRetainers: activeRetainers,
    recurringRevenueShare: totalRevenue === 0 ? 0 : totalRetainerRevenue / totalRevenue
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function main() {
  const argPath = process.argv[2] || 'ops/revenue/forecast.example.json';
  const absolute = path.resolve(argPath);

  if (!fs.existsSync(absolute)) {
    throw new Error(`Input file not found: ${absolute}`);
  }

  const raw = fs.readFileSync(absolute, 'utf8');
  const parsed = JSON.parse(raw);

  if (!parsed.scenarios || !Array.isArray(parsed.scenarios) || parsed.scenarios.length === 0) {
    throw new Error('Input must contain a non-empty scenarios array');
  }

  const output = parsed.scenarios.map(runScenario);

  console.log('Revenue forecast results');
  console.log('========================');
  for (const row of output) {
    console.log(`Scenario: ${row.name}`);
    console.log(`  Months: ${row.months}`);
    console.log(`  Revenue: ${formatCurrency(row.projectedRevenue)}`);
    console.log(`  MRR (end): ${formatCurrency(row.projectedMRR)}`);
    console.log(`  Active retainers (end): ${row.projectedActiveRetainers}`);
    console.log(`  Recurring share: ${(row.recurringRevenueShare * 100).toFixed(1)}%`);
    console.log('');
  }
}

main();
