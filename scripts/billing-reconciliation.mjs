#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const strictMode = args.includes('--strict');
const markdownMode = args.includes('--markdown');

const runtimePath = path.resolve('ops/runtime/runtime-state.json');
const reportJsonPath = path.resolve('ops/runtime/billing-reconciliation-report.json');
const reportMdPath = path.resolve('ops/runtime/billing-reconciliation-report.md');

function readRuntimeState() {
  if (!fs.existsSync(runtimePath)) {
    return {
      payments: {},
      invoices: {}
    };
  }

  const raw = fs.readFileSync(runtimePath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    payments: parsed.payments || {},
    invoices: parsed.invoices || {}
  };
}

function toArrayMap(obj) {
  return Object.entries(obj || {}).map(([id, value]) => ({ id, ...(value || {}) }));
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

function isSyntheticFixture(payment, invoice) {
  return (
    startsWithAny(payment?.paymentId, ['pay_manual_']) ||
    startsWithAny(payment?.customerId, ['cust_manual_']) ||
    startsWithAny(payment?.productId, ['sandbox-', 'test-', 'demo-']) ||
    hasLocalRecipient(invoice)
  );
}

function buildReport(runtime) {
  const payments = toArrayMap(runtime.payments);
  const invoices = toArrayMap(runtime.invoices);

  const succeededPayments = payments.filter((payment) => payment.status === 'succeeded');

  const invoiceByPaymentId = new Map();
  for (const invoice of invoices) {
    if (typeof invoice.paymentId === 'string' && invoice.paymentId.trim().length > 0) {
      invoiceByPaymentId.set(invoice.paymentId, invoice);
    }
  }

  const missingInvoiceForSucceededPayment = [];
  const nonIssuedInvoiceForSucceededPayment = [];
  const excludedSyntheticFixtures = [];

  let succeededPaymentsInScope = 0;

  for (const payment of succeededPayments) {
    const invoice = invoiceByPaymentId.get(payment.paymentId);

    if (isSyntheticFixture(payment, invoice)) {
      excludedSyntheticFixtures.push({
        paymentId: payment.paymentId,
        customerId: payment.customerId,
        invoiceStatus: invoice?.status || 'missing',
        reason: 'synthetic-fixture'
      });
      continue;
    }

    succeededPaymentsInScope += 1;

    if (!invoice) {
      missingInvoiceForSucceededPayment.push({
        paymentId: payment.paymentId,
        customerId: payment.customerId,
        amount: payment.amount,
        currency: payment.currency
      });
      continue;
    }

    if (invoice.status !== 'issued') {
      nonIssuedInvoiceForSucceededPayment.push({
        paymentId: payment.paymentId,
        invoiceStatus: invoice.status,
        detail: invoice.detail || ''
      });
    }
  }

  const invoiceWithoutPayment = invoices
    .filter((invoice) => !runtime.payments[invoice.paymentId])
    .map((invoice) => ({
      paymentId: invoice.paymentId,
      invoiceStatus: invoice.status,
      cfdiUuid: invoice.cfdiUuid
    }));

  const duplicateIssuedCfdiUuid = [];
  const seenUuid = new Set();
  for (const invoice of invoices) {
    if (invoice.status !== 'issued' || !invoice.cfdiUuid) {
      continue;
    }
    if (seenUuid.has(invoice.cfdiUuid)) {
      duplicateIssuedCfdiUuid.push({
        paymentId: invoice.paymentId,
        cfdiUuid: invoice.cfdiUuid
      });
      continue;
    }
    seenUuid.add(invoice.cfdiUuid);
  }

  const mismatchCount =
    missingInvoiceForSucceededPayment.length +
    nonIssuedInvoiceForSucceededPayment.length +
    invoiceWithoutPayment.length +
    duplicateIssuedCfdiUuid.length;

  let status = 'ok';
  let statusReason = 'all-checks-match';
  if (mismatchCount > 0) {
    status = 'mismatch';
    statusReason = 'detected-fiscal-mismatch';
  } else if (succeededPayments.length > 0 && succeededPaymentsInScope === 0) {
    status = 'unknown';
    statusReason = 'no-real-scope-payments';
  }

  return {
    generatedAt: new Date().toISOString(),
    status,
    statusReason,
    totals: {
      payments: payments.length,
      succeededPayments: succeededPayments.length,
      succeededPaymentsInScope,
      excludedSyntheticFixtures: excludedSyntheticFixtures.length,
      invoices: invoices.length,
      mismatchCount
    },
    checks: {
      missingInvoiceForSucceededPayment,
      nonIssuedInvoiceForSucceededPayment,
      invoiceWithoutPayment,
      duplicateIssuedCfdiUuid,
      excludedSyntheticFixtures
    }
  };
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(reportJsonPath), { recursive: true });
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const lines = [];
  lines.push('# Billing Reconciliation Report');
  lines.push('');
  lines.push(`- generatedAt: ${report.generatedAt}`);
  lines.push(`- status: ${report.status.toUpperCase()}`);
  lines.push(`- statusReason: ${report.statusReason}`);
  lines.push(`- payments: ${report.totals.payments}`);
  lines.push(`- succeededPayments: ${report.totals.succeededPayments}`);
  lines.push(`- succeededPaymentsInScope: ${report.totals.succeededPaymentsInScope}`);
  lines.push(`- excludedSyntheticFixtures: ${report.totals.excludedSyntheticFixtures}`);
  lines.push(`- invoices: ${report.totals.invoices}`);
  lines.push(`- mismatchCount: ${report.totals.mismatchCount}`);
  lines.push('');

  lines.push('## Missing Invoice For Succeeded Payment');
  if (report.checks.missingInvoiceForSucceededPayment.length === 0) {
    lines.push('- none');
  } else {
    for (const item of report.checks.missingInvoiceForSucceededPayment) {
      lines.push(`- paymentId: ${item.paymentId} | customerId: ${item.customerId} | amount: ${item.amount} ${item.currency}`);
    }
  }

  lines.push('');
  lines.push('## Non-Issued Invoice For Succeeded Payment');
  if (report.checks.nonIssuedInvoiceForSucceededPayment.length === 0) {
    lines.push('- none');
  } else {
    for (const item of report.checks.nonIssuedInvoiceForSucceededPayment) {
      lines.push(`- paymentId: ${item.paymentId} | invoiceStatus: ${item.invoiceStatus} | detail: ${item.detail}`);
    }
  }

  lines.push('');
  lines.push('## Invoice Without Payment');
  if (report.checks.invoiceWithoutPayment.length === 0) {
    lines.push('- none');
  } else {
    for (const item of report.checks.invoiceWithoutPayment) {
      lines.push(`- paymentId: ${item.paymentId} | invoiceStatus: ${item.invoiceStatus} | cfdiUuid: ${item.cfdiUuid || 'n/a'}`);
    }
  }

  lines.push('');
  lines.push('## Duplicate Issued CFDI UUID');
  if (report.checks.duplicateIssuedCfdiUuid.length === 0) {
    lines.push('- none');
  } else {
    for (const item of report.checks.duplicateIssuedCfdiUuid) {
      lines.push(`- paymentId: ${item.paymentId} | cfdiUuid: ${item.cfdiUuid}`);
    }
  }

  lines.push('');
  lines.push('## Excluded Synthetic Fixtures');
  if (report.checks.excludedSyntheticFixtures.length === 0) {
    lines.push('- none');
  } else {
    for (const item of report.checks.excludedSyntheticFixtures) {
      lines.push(`- paymentId: ${item.paymentId} | customerId: ${item.customerId} | invoiceStatus: ${item.invoiceStatus} | reason: ${item.reason}`);
    }
  }

  fs.writeFileSync(reportMdPath, `${lines.join('\n')}\n`, 'utf8');
}

function printSummary(report) {
  const text = [
    'Billing Reconciliation',
    '======================',
    `Status: ${report.status.toUpperCase()}`,
    `Status reason: ${report.statusReason}`,
    `Payments: ${report.totals.payments}`,
    `Succeeded payments: ${report.totals.succeededPayments}`,
    `Succeeded payments in scope: ${report.totals.succeededPaymentsInScope}`,
    `Excluded synthetic fixtures: ${report.totals.excludedSyntheticFixtures}`,
    `Invoices: ${report.totals.invoices}`,
    `Mismatches: ${report.totals.mismatchCount}`
  ].join('\n');

  process.stdout.write(`${text}\n`);
}

try {
  const runtime = readRuntimeState();
  const report = buildReport(runtime);
  writeReport(report);

  if (markdownMode) {
    process.stdout.write(fs.readFileSync(reportMdPath, 'utf8'));
  } else {
    printSummary(report);
  }

  if (strictMode && report.status !== 'ok') {
    process.exit(2);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
