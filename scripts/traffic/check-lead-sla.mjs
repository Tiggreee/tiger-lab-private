#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const TARGET_MINUTES = 15;
const LOG_PATH = path.resolve('ops/traffic/lead-response-log.json');

function formatMinutes(value) {
  if (!Number.isFinite(value)) {
    return 'N/A';
  }

  return `${value.toFixed(1)}m`;
}

function readLog() {
  if (!fs.existsSync(LOG_PATH)) {
    throw new Error(
      `Missing ${LOG_PATH}. Create it from ops/traffic/lead-response-log.example.json and log daily lead response times.`
    );
  }

  const parsed = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
  return Array.isArray(parsed.items) ? parsed.items : [];
}

function compute(items) {
  const valid = items
    .map((item) => {
      const started = new Date(item.leadCapturedAt).getTime();
      const replied = new Date(item.firstHumanReplyAt).getTime();
      const minutes = (replied - started) / 60000;
      return {
        leadId: item.leadId || 'unknown',
        channel: item.channel || 'unknown',
        minutes
      };
    })
    .filter((item) => Number.isFinite(item.minutes) && item.minutes >= 0);

  const breaches = valid.filter((item) => item.minutes > TARGET_MINUTES);
  const average = valid.length
    ? valid.reduce((sum, item) => sum + item.minutes, 0) / valid.length
    : Number.NaN;

  return {
    total: valid.length,
    breaches,
    average
  };
}

function printReport(summary) {
  process.stdout.write('Lead response SLA check\n');
  process.stdout.write('-----------------------\n');
  process.stdout.write(`Target: <= ${TARGET_MINUTES}m\n`);
  process.stdout.write(`Samples: ${summary.total}\n`);
  process.stdout.write(`Average: ${formatMinutes(summary.average)}\n`);

  if (summary.breaches.length === 0) {
    process.stdout.write('Breaches: 0\n');
    return;
  }

  process.stdout.write(`Breaches: ${summary.breaches.length}\n`);
  for (const breach of summary.breaches) {
    process.stdout.write(
      `- ${breach.leadId} (${breach.channel}) responded in ${formatMinutes(breach.minutes)}\n`
    );
  }
}

function main() {
  const items = readLog();
  const summary = compute(items);
  printReport(summary);

  if (summary.total === 0) {
    process.exit(1);
  }

  if (summary.breaches.length > 0) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
