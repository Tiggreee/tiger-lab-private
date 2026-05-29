import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { ProvisionAccountCommand } from '../../src/billing/application/ports/in/commands';
import { bootstrapApplication } from '../../src/shared/infrastructure/bootstrap/app-bootstrap';
import { handleCliError } from '../shared/cli-error-handler';
import { resolveIdempotencyKey } from '../shared/cli-idempotency';
import { attachIdempotencyKey, createCliContext, logInfo } from '../shared/cli-logger';
import { getBooleanOption, getStringOption, parseCliArgs } from '../shared/cli-parser';

export async function runProvisionAccount(argv: string[]): Promise<number> {
  const parsed = parseCliArgs(argv);
  const requestId = getStringOption(parsed, 'request-id');
  const correlationId = getStringOption(parsed, 'correlation-id');

  let context = createCliContext('run-provision-account', requestId, correlationId);

  try {
    const idempotencyKey = resolveIdempotencyKey({
      command: 'run-provision-account',
      requestId: context.requestId,
      explicitKey: getStringOption(parsed, 'idempotency-key'),
      autoGenerate: getBooleanOption(parsed, 'auto-idempotency')
    });

    context = attachIdempotencyKey(context, idempotencyKey);

    const command: ProvisionAccountCommand = {
      accountId: getStringOption(parsed, 'account-id') || `acct-${Date.now()}-${randomUUID().slice(0, 8)}`,
      paymentId: getStringOption(parsed, 'payment-id') || 'payment-default'
    };

    const { container } = bootstrapApplication();
    await container.provisionAccountHandler.execute(command);

    logInfo(context, 'Provision account command executed', {
      command
    });

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        command: 'provision-account',
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
  void runProvisionAccount(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
