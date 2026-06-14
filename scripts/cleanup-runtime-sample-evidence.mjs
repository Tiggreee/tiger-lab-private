#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sampleKeyPattern = /^(pay_sample_|cust_sample_)/;
const sampleValuePattern = /(pay_sample_|cust_sample_)/;

function fullPath(relPath) {
  return path.join(root, relPath);
}

function exists(relPath) {
  return fs.existsSync(fullPath(relPath));
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(fullPath(relPath), 'utf8'));
}

function writeJson(relPath, value) {
  fs.writeFileSync(fullPath(relPath), JSON.stringify(value, null, 2) + '\n');
}

function containsSample(value) {
  if (typeof value === 'string') return sampleValuePattern.test(value);
  if (Array.isArray(value)) return value.some((item) => containsSample(item));
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, nested]) => sampleKeyPattern.test(key) || containsSample(nested));
  }
  return false;
}

function cleanRecursively(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanRecursively(item))
      .filter((item) => item !== undefined && !containsSample(item));
  }

  if (value && typeof value === 'object') {
    const output = {};
    for (const [key, nested] of Object.entries(value)) {
      if (sampleKeyPattern.test(key)) continue;
      const cleaned = cleanRecursively(nested);
      if (cleaned === undefined) continue;
      if (containsSample(cleaned)) continue;
      output[key] = cleaned;
    }
    return output;
  }

  if (typeof value === 'string' && sampleValuePattern.test(value)) return undefined;
  return value;
}

function cleanFunnelEvents() {
  const relPath = 'ops/runtime/funnel-events.jsonl';
  if (!exists(relPath)) return;
  const lines = fs.readFileSync(fullPath(relPath), 'utf8').split(/\r?\n/).filter(Boolean);
  const cleaned = lines.filter((line) => !sampleValuePattern.test(line));
  fs.writeFileSync(fullPath(relPath), cleaned.join('\n') + (cleaned.length ? '\n' : ''));
}

function cleanRuntimeState() {
  const relPath = 'ops/runtime/runtime-state.json';
  if (!exists(relPath)) return;
  const state = readJson(relPath);
  writeJson(relPath, cleanRecursively(state));
}

function cleanInvoicePendingReport() {
  const relPath = 'ops/runtime/invoice-pending-report.json';
  if (!exists(relPath)) return;
  const report = readJson(relPath);
  const pending = (report.pending || []).filter((item) => !containsSample(item));
  const failed = pending.filter((entry) => entry.status === 'failed').length;
  const skipped = pending.filter((entry) => entry.status === 'skipped').length;

  report.pending = pending;
  report.totals = {
    invoices: pending.length,
    pending: pending.length,
    skipped,
    failed,
  };

  writeJson(relPath, report);
}

function cleanBillingReconciliationReports() {
  const jsonRelPath = 'ops/runtime/billing-reconciliation-report.json';
  if (!exists(jsonRelPath)) return;

  const report = readJson(jsonRelPath);
  const checks = report.checks || {};
  checks.missingInvoiceForSucceededPayment = (checks.missingInvoiceForSucceededPayment || []).filter((entry) => !containsSample(entry));
  checks.nonIssuedInvoiceForSucceededPayment = (checks.nonIssuedInvoiceForSucceededPayment || []).filter((entry) => !containsSample(entry));
  checks.invoiceWithoutPayment = (checks.invoiceWithoutPayment || []).filter((entry) => !containsSample(entry));
  checks.duplicateIssuedCfdiUuid = (checks.duplicateIssuedCfdiUuid || []).filter((entry) => !containsSample(entry));
  report.checks = checks;

  const mismatchCount =
    checks.missingInvoiceForSucceededPayment.length +
    checks.nonIssuedInvoiceForSucceededPayment.length +
    checks.invoiceWithoutPayment.length +
    checks.duplicateIssuedCfdiUuid.length;

  report.totals = {
    payments: report.totals?.payments ?? 0,
    succeededPayments: report.totals?.succeededPayments ?? 0,
    invoices: report.totals?.invoices ?? 0,
    mismatchCount,
  };
  report.status = mismatchCount > 0 ? 'mismatch' : 'ok';
  writeJson(jsonRelPath, report);

  const markdownRelPath = 'ops/runtime/billing-reconciliation-report.md';
  if (!exists(markdownRelPath)) return;

  const lines = [];
  lines.push('# Billing Reconciliation Report');
  lines.push('');
  lines.push(`- generatedAt: ${report.generatedAt}`);
  lines.push(`- status: ${String(report.status || '').toUpperCase()}`);
  lines.push(`- payments: ${report.totals?.payments ?? 0}`);
  lines.push(`- succeededPayments: ${report.totals?.succeededPayments ?? 0}`);
  lines.push(`- invoices: ${report.totals?.invoices ?? 0}`);
  lines.push(`- mismatchCount: ${report.totals?.mismatchCount ?? 0}`);
  lines.push('');

  const sections = [
    ['Missing Invoice For Succeeded Payment', report.checks?.missingInvoiceForSucceededPayment || []],
    ['Non-Issued Invoice For Succeeded Payment', report.checks?.nonIssuedInvoiceForSucceededPayment || []],
    ['Invoice Without Payment', report.checks?.invoiceWithoutPayment || []],
    ['Duplicate Issued CFDI UUID', report.checks?.duplicateIssuedCfdiUuid || []],
  ];

  for (const [title, items] of sections) {
    lines.push(`## ${title}`);
    if (!items.length) {
      lines.push('- none');
      lines.push('');
      continue;
    }

    for (const item of items) {
      const paymentId = item.paymentId ? `paymentId: ${item.paymentId} | ` : '';
      const invoiceStatus = item.invoiceStatus ? `invoiceStatus: ${item.invoiceStatus} | ` : '';
      const detail = item.detail ? `detail: ${item.detail}` : JSON.stringify(item);
      lines.push(`- ${paymentId}${invoiceStatus}${detail}`);
    }
    lines.push('');
  }

  fs.writeFileSync(fullPath(markdownRelPath), lines.join('\n') + '\n');
}

cleanFunnelEvents();
cleanRuntimeState();
cleanInvoicePendingReport();
cleanBillingReconciliationReports();

console.log('Cleaned runtime sample evidence.');