import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readRuntimeState } from '../../src/shared/infrastructure/persistence/runtime-state';
import { FacturamaResendInvoiceAutomationService } from '../../server/bootstrap/invoice-automation-service';

interface RetryItem {
  paymentId: string;
  status: 'issued' | 'skipped' | 'failed';
  detail: string;
}

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return undefined;
  return process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function runInvoiceRetry(argv: string[]): Promise<number> {
  const strict = argv.includes('--strict');
  const paymentIdFilter = getArg('--payment-id');
  const buyerEmail = getArg('--buyer-email');
  const sellerEmail = getArg('--seller-email') || process.env.BILLING_SELLER_EMAIL;
  const accountantEmail = getArg('--accountant-email') || process.env.BILLING_ACCOUNTANT_EMAIL;

  const state = await readRuntimeState();
  const invoiceService = new FacturamaResendInvoiceAutomationService();

  const candidateInvoices = Object.values(state.invoices || {}).filter((invoice) => {
    if (paymentIdFilter && invoice.paymentId !== paymentIdFilter) return false;
    return invoice.status === 'skipped' || invoice.status === 'failed';
  });

  const report: {
    generatedAt: string;
    strict: boolean;
    attempted: number;
    issued: number;
    skipped: number;
    failed: number;
    items: RetryItem[];
  } = {
    generatedAt: new Date().toISOString(),
    strict,
    attempted: 0,
    issued: 0,
    skipped: 0,
    failed: 0,
    items: []
  };

  for (const invoice of candidateInvoices) {
    const payment = state.payments?.[invoice.paymentId];
    if (!payment || payment.status !== 'succeeded') {
      report.skipped += 1;
      report.items.push({
        paymentId: invoice.paymentId,
        status: 'skipped',
        detail: 'Payment missing or not succeeded.'
      });
      continue;
    }

    report.attempted += 1;

    try {
      const result = await invoiceService.issueAndNotify({
        paymentId: payment.paymentId,
        customerId: payment.customerId,
        productId: payment.productId,
        planId: payment.planId,
        amount: payment.amount,
        currency: payment.currency,
        buyerEmail,
        sellerEmail,
        accountantEmail
      });

      if (result.status === 'issued') report.issued += 1;
      if (result.status === 'skipped') report.skipped += 1;
      if (result.status === 'failed') report.failed += 1;

      report.items.push({
        paymentId: payment.paymentId,
        status: result.status,
        detail: result.detail
      });
    } catch (error) {
      report.failed += 1;
      report.items.push({
        paymentId: payment.paymentId,
        status: 'failed',
        detail: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const runtimeDir = path.resolve('ops/runtime');
  fs.mkdirSync(runtimeDir, { recursive: true });
  const reportPath = path.join(runtimeDir, 'invoice-retry-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(JSON.stringify(report, null, 2));
  console.log(`Report written: ${reportPath}`);

  if (strict && (report.failed > 0 || report.issued === 0)) {
    return 2;
  }

  return 0;
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && import.meta.url === pathToFileURL(entry).href);
}

if (isDirectExecution()) {
  void runInvoiceRetry(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}

export { runInvoiceRetry };
