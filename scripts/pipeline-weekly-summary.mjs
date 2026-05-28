import fs from 'node:fs';
import path from 'node:path';

const PIPELINE_PATH = path.resolve('ops/pipeline/weekly-pipeline.json');

function daysUntil(dateISO) {
  const now = new Date();
  const due = new Date(`${dateISO}T23:59:59`);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatUSD(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function load() {
  if (!fs.existsSync(PIPELINE_PATH)) {
    throw new Error(`Pipeline file not found: ${PIPELINE_PATH}`);
  }
  return JSON.parse(fs.readFileSync(PIPELINE_PATH, 'utf8'));
}

function summarize(data) {
  const deals = data.deals || [];
  const weightedPipeline = deals.reduce((sum, d) => sum + d.value * d.probability, 0);
  const weightedMRR = deals
    .filter((d) => d.isMRR)
    .reduce((sum, d) => sum + d.value * d.probability, 0);

  const urgentHumanActions = deals.filter(
    (d) => d.owner === 'human' && daysUntil(d.dueDate) <= 1
  );

  const stageCount = {
    lead: 0,
    discovery: 0,
    proposal: 0,
    negotiation: 0,
    closed: 0,
    lost: 0
  };

  for (const d of deals) {
    if (stageCount[d.stage] !== undefined) stageCount[d.stage] += 1;
  }

  return {
    weightedPipeline,
    weightedMRR,
    urgentHumanActions,
    stageCount,
    totalDeals: deals.length
  };
}

function printConsole(data, s) {
  const t = data.meta.weeklyTargets;

  console.log('Weekly Sales Pipeline Summary');
  console.log('============================');
  console.log(`Week start: ${data.meta.weekStart}`);
  console.log(`Total deals: ${s.totalDeals}`);
  console.log(`Weighted pipeline: ${formatUSD(s.weightedPipeline)}`);
  console.log(`Weighted MRR: ${formatUSD(s.weightedMRR)}`);
  console.log('');
  console.log('Weekly targets:');
  console.log(`- New leads: ${t.newLeads}`);
  console.log(`- Discovery calls: ${t.discoveryCalls}`);
  console.log(`- Proposals sent: ${t.proposalsSent}`);
  console.log(`- Deals closed: ${t.dealsClosed}`);
  console.log(`- New MRR target: ${formatUSD(t.newMRR)}`);
  console.log(`- One-off revenue target: ${formatUSD(t.oneOffRevenue)}`);
  console.log('');
  console.log('Stage distribution:');
  for (const [stage, count] of Object.entries(s.stageCount)) {
    console.log(`- ${stage}: ${count}`);
  }

  console.log('');
  console.log('Urgent human actions (<= 1 day):');
  if (s.urgentHumanActions.length === 0) {
    console.log('- No urgent human actions due in the next day.');
  } else {
    for (const d of s.urgentHumanActions) {
      const delta = daysUntil(d.dueDate);
      const dueText = delta < 0 ? `OVERDUE ${Math.abs(delta)}d` : delta === 0 ? 'DUE TODAY' : 'DUE 1d';
      console.log(`- [${d.id}] ${d.name} | ${dueText} | ${d.nextAction}`);
    }
  }
}

function printMarkdown(data, s) {
  const t = data.meta.weeklyTargets;
  const lines = [];
  lines.push('# Weekly Pipeline Update');
  lines.push('');
  lines.push(`- Week start: ${data.meta.weekStart}`);
  lines.push(`- Total deals: ${s.totalDeals}`);
  lines.push(`- Weighted pipeline: ${formatUSD(s.weightedPipeline)}`);
  lines.push(`- Weighted MRR: ${formatUSD(s.weightedMRR)}`);
  lines.push('');
  lines.push('## Targets');
  lines.push(`- New leads: ${t.newLeads}`);
  lines.push(`- Discovery calls: ${t.discoveryCalls}`);
  lines.push(`- Proposals sent: ${t.proposalsSent}`);
  lines.push(`- Deals closed: ${t.dealsClosed}`);
  lines.push(`- New MRR target: ${formatUSD(t.newMRR)}`);
  lines.push(`- One-off revenue target: ${formatUSD(t.oneOffRevenue)}`);
  lines.push('');
  lines.push('## Urgent Human Actions');

  if (s.urgentHumanActions.length === 0) {
    lines.push('- No urgent human actions due in the next day.');
  } else {
    for (const d of s.urgentHumanActions) {
      const delta = daysUntil(d.dueDate);
      const dueText = delta < 0 ? `OVERDUE ${Math.abs(delta)}d` : delta === 0 ? 'DUE TODAY' : 'DUE 1d';
      lines.push(`- [${d.id}] ${d.name} | ${dueText} | ${d.nextAction}`);
    }
  }

  process.stdout.write(`${lines.join('\n')}\n`);
}

function main() {
  const data = load();
  const summary = summarize(data);
  if (process.argv.includes('--markdown')) {
    printMarkdown(data, summary);
  } else {
    printConsole(data, summary);
  }
}

main();
