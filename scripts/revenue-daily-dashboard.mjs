#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ARGS = process.argv.slice(2);
const MARKDOWN_MODE = ARGS.includes('--markdown');

const NORTH_STAR_PATH = path.resolve('ops/revenue/north-star.json');
const PIPELINE_PATH = path.resolve('ops/pipeline/weekly-pipeline.json');
const FUNNEL_PATH = path.resolve('ops/runtime/funnel-events.jsonl');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function formatUSD(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function isThisWeek(isoDate) {
  const now = new Date();
  const date = new Date(isoDate);

  const day = (now.getDay() + 6) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return date >= start && date < end;
}

function summarize(northStar, pipeline, events) {
  const deals = pipeline.deals || [];
  const weightedPipeline = deals.reduce((sum, deal) => sum + deal.value * deal.probability, 0);
  const weightedMRR = deals
    .filter((deal) => deal.isMRR)
    .reduce((sum, deal) => sum + deal.value * deal.probability, 0);

  const conversationsThisWeek = events.filter(
    (event) => event.type === 'conversation_entry' && isThisWeek(event.occurredAt)
  ).length;

  const paymentsThisWeek = events.filter(
    (event) => event.type === 'payment_succeeded' && isThisWeek(event.occurredAt)
  );

  const paidRevenueThisWeek = paymentsThisWeek.reduce((sum, event) => {
    const amount = Number(event?.payload?.amount || 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  return {
    northStar,
    weightedPipeline,
    weightedMRR,
    conversationsThisWeek,
    paidRevenueThisWeek,
    paidCountThisWeek: paymentsThisWeek.length
  };
}

function printConsole(summary) {
  const targetConversations = Number(summary.northStar.targets.qualifiedConversationsPerWeek || 0);
  const targetRevenue = Number(summary.northStar.targets.weeklyRevenueUSD || 0);

  console.log('Daily Revenue Dashboard');
  console.log('=======================');
  console.log(`North star: ${summary.northStar.northStarMetric}`);
  console.log(`Conversations this week: ${summary.conversationsThisWeek}/${targetConversations}`);
  console.log(`Paid revenue this week: ${formatUSD(summary.paidRevenueThisWeek)}/${formatUSD(targetRevenue)}`);
  console.log(`Payments this week: ${summary.paidCountThisWeek}`);
  console.log(`Weighted pipeline: ${formatUSD(summary.weightedPipeline)}`);
  console.log(`Weighted MRR: ${formatUSD(summary.weightedMRR)}`);
  console.log('');

  if (summary.conversationsThisWeek < targetConversations) {
    console.log('Action: increase LinkedIn outreach today and prioritize response speed.');
  } else {
    console.log('Action: maintain current outreach cadence and optimize close rate.');
  }
}

function printMarkdown(summary) {
  const targetConversations = Number(summary.northStar.targets.qualifiedConversationsPerWeek || 0);
  const targetRevenue = Number(summary.northStar.targets.weeklyRevenueUSD || 0);

  const lines = [];
  lines.push('# Daily Revenue Dashboard');
  lines.push('');
  lines.push(`- North star metric: ${summary.northStar.northStarMetric}`);
  lines.push(`- Conversations this week: ${summary.conversationsThisWeek}/${targetConversations}`);
  lines.push(`- Paid revenue this week: ${formatUSD(summary.paidRevenueThisWeek)}/${formatUSD(targetRevenue)}`);
  lines.push(`- Payments this week: ${summary.paidCountThisWeek}`);
  lines.push(`- Weighted pipeline: ${formatUSD(summary.weightedPipeline)}`);
  lines.push(`- Weighted MRR: ${formatUSD(summary.weightedMRR)}`);
  lines.push('');
  lines.push('## Recommended next action');

  if (summary.conversationsThisWeek < targetConversations) {
    lines.push('- Increase LinkedIn outbound and reply speed immediately.');
  } else {
    lines.push('- Keep cadence and focus on proposal and close conversion.');
  }

  process.stdout.write(`${lines.join('\n')}\n`);
}

function main() {
  const northStar = readJson(NORTH_STAR_PATH);
  const pipeline = readJson(PIPELINE_PATH);
  const events = readJsonl(FUNNEL_PATH);
  const summary = summarize(northStar, pipeline, events);

  if (MARKDOWN_MODE) {
    printMarkdown(summary);
    return;
  }

  printConsole(summary);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
