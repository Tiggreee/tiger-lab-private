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

function startsWithAny(value, prefixes) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  return prefixes.some((prefix) => normalized.startsWith(prefix));
}

function hasLocalRecipient(invoice) {
  const recipients = Array.isArray(invoice?.recipients) ? invoice.recipients : [];
  if (recipients.length === 0) return false;
  return recipients.every((recipient) => String(recipient || '').trim().toLowerCase().endsWith('@local.dev'));
}

function isSyntheticFixture(invoice) {
  return (
    startsWithAny(invoice?.paymentId, ['pay_manual_']) ||
    startsWithAny(invoice?.customerId, ['cust_manual_']) ||
    startsWithAny(invoice?.productId, ['sandbox-', 'test-', 'demo-']) ||
    hasLocalRecipient(invoice)
  );
}

function buildPendingReport(invoicesMap) {
  const invoices = Object.values(invoicesMap || {});
  const pending = invoices.filter((invoice) => invoice.status !== 'issued' && !isSyntheticFixture(invoice));
  const excludedSyntheticFixtures = invoices.filter((invoice) => invoice.status !== 'issued' && isSyntheticFixture(invoice));

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
      failed: grouped.failed.length,
      excludedSyntheticFixtures: excludedSyntheticFixtures.length
    },
    excludedSyntheticFixtures,
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
  process.stdout.write(`Excluded synthetic fixtures: ${report.totals.excludedSyntheticFixtures}\n\n`);

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
  lines.push(`- excludedSyntheticFixtures: ${report.totals.excludedSyntheticFixtures}`);
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
