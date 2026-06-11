#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const markdownMode = process.argv.slice(2).includes('--markdown');
const runtimePath = path.resolve('ops/runtime/runtime-state.json');
const reportPath = path.resolve('ops/runtime/invoice-pending-report.json');

function readRuntimeState() {
  if (!fs.existsSync(runtimePath)) {
    return { invoices: {} };
  }

  const raw = fs.readFileSync(runtimePath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    invoices: parsed.invoices || {}
  };
}

function buildPendingReport(invoicesMap) {
  const invoices = Object.values(invoicesMap || {});
  const pending = invoices.filter((invoice) => invoice.status !== 'issued');

  const grouped = {
    skipped: pending.filter((invoice) => invoice.status === 'skipped'),
    failed: pending.filter((invoice) => invoice.status === 'failed')
  };

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      invoices: invoices.length,
      pending: pending.length,
      skipped: grouped.skipped.length,
      failed: grouped.failed.length
    },
    pending
  };
}

function printConsole(report) {
  process.stdout.write('Invoice Pending Report\n');
  process.stdout.write('====================\n');
  process.stdout.write(`Invoices: ${report.totals.invoices}\n`);
  process.stdout.write(`Pending: ${report.totals.pending}\n`);
  process.stdout.write(`Skipped: ${report.totals.skipped}\n`);
  process.stdout.write(`Failed: ${report.totals.failed}\n\n`);

  for (const item of report.pending) {
    process.stdout.write(
      `- paymentId=${item.paymentId} status=${item.status} detail=${item.detail || 'n/a'} recipients=${(item.recipients || []).join(',')}\n`
    );
  }
}

function printMarkdown(report) {
  const lines = [];
  lines.push('# Invoice Pending Report');
  lines.push('');
  lines.push(`- generatedAt: ${report.generatedAt}`);
  lines.push(`- invoices: ${report.totals.invoices}`);
  lines.push(`- pending: ${report.totals.pending}`);
  lines.push(`- skipped: ${report.totals.skipped}`);
  lines.push(`- failed: ${report.totals.failed}`);
  lines.push('');

  if (report.pending.length === 0) {
    lines.push('No pending invoices.');
  } else {
    for (const item of report.pending) {
      lines.push(`- paymentId: ${item.paymentId} | status: ${item.status} | detail: ${item.detail || 'n/a'}`);
    }
  }

  process.stdout.write(`${lines.join('\n')}\n`);
}

try {
  const runtime = readRuntimeState();
  const report = buildPendingReport(runtime.invoices);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (markdownMode) {
    printMarkdown(report);
  } else {
    printConsole(report);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
