import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { RegisterPaymentCommand } from '../../src/billing/application/ports/in/commands';
import { bootstrapApplication } from '../../src/shared/infrastructure/bootstrap/app-bootstrap';
import { handleCliError } from '../shared/cli-error-handler';
import { resolveIdempotencyKey } from '../shared/cli-idempotency';
import { attachIdempotencyKey, createCliContext, logInfo } from '../shared/cli-logger';
import { getBooleanOption, getStringOption, parseCliArgs } from '../shared/cli-parser';

export async function runRegisterPayment(argv: string[]): Promise<number> {
  const parsed = parseCliArgs(argv);
  const requestId = getStringOption(parsed, 'request-id');
  const correlationId = getStringOption(parsed, 'correlation-id');

  let context = createCliContext('run-register-payment', requestId, correlationId);

  try {
    const amount = Number(getStringOption(parsed, 'amount', parsed.positional[0] || '39'));

    const idempotencyKey = resolveIdempotencyKey({
      command: 'run-register-payment',
      requestId: context.requestId,
      explicitKey: getStringOption(parsed, 'idempotency-key'),
      autoGenerate: getBooleanOption(parsed, 'auto-idempotency')
    });

    context = attachIdempotencyKey(context, idempotencyKey);

    const command: RegisterPaymentCommand = {
      paymentId: getStringOption(parsed, 'payment-id') || `pay-${Date.now()}-${randomUUID().slice(0, 8)}`,
      customerId: getStringOption(parsed, 'customer-id') || 'cli-customer',
      productId: getStringOption(parsed, 'product-id') || 'facturautentico-cloud',
      planId: getStringOption(parsed, 'plan-id') || 'starter',
      amount: Number.isFinite(amount) ? amount : 39,
      currency: (getStringOption(parsed, 'currency') || 'USD').toUpperCase()
    };

    const { container } = bootstrapApplication();
    await container.registerPaymentHandler.execute(command);

    logInfo(context, 'Register payment command executed', {
      command
    });

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        command: 'register-payment',
        requestId: context.requestId,
        correlationId: context.correlationId,
        idempotencyKey: context.idempotencyKey,
        data: command
      })}\n`
    );

    return 0;
  } catch (error) {
    return handleCliError(context, error);
  }
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && import.meta.url === pathToFileURL(entry).href);
}

if (isDirectExecution()) {
  void runRegisterPayment(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
