import { pathToFileURL } from 'node:url';
import { ResolveOfferQuery } from '../../src/catalog/application/ports/in/queries';
import { bootstrapApplication } from '../../src/shared/infrastructure/bootstrap/app-bootstrap';
import { CliError, handleCliError } from '../shared/cli-error-handler';
import { resolveIdempotencyKey } from '../shared/cli-idempotency';
import { attachIdempotencyKey, createCliContext, logInfo } from '../shared/cli-logger';
import { getBooleanOption, getStringOption, parseCliArgs } from '../shared/cli-parser';

export async function runResolveOffer(argv: string[]): Promise<number> {
  const parsed = parseCliArgs(argv);
  const requestId = getStringOption(parsed, 'request-id');
  const correlationId = getStringOption(parsed, 'correlation-id');

  let context = createCliContext('run-resolve-offer', requestId, correlationId);

  try {
    const productId = getStringOption(parsed, 'product-id', parsed.positional[0]) || 'facturautentico-cloud';
    const planId = getStringOption(parsed, 'plan-id', parsed.positional[1]) || 'starter';

    if (!productId || !planId) {
      throw new CliError('INVALID_ARGS', 'Resolve offer requires productId and planId');
    }

    const idempotencyKey = resolveIdempotencyKey({
      command: 'run-resolve-offer',
      requestId: context.requestId,
      explicitKey: getStringOption(parsed, 'idempotency-key'),
      autoGenerate: getBooleanOption(parsed, 'auto-idempotency')
    });

    context = attachIdempotencyKey(context, idempotencyKey);

    const command: ResolveOfferQuery = {
      productId,
      planId
    };

    const { container } = bootstrapApplication();
    await container.resolveOfferHandler.execute(command);

    logInfo(context, 'Resolve offer query executed', {
      command
    });

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        command: 'resolve-offer',
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
  void runResolveOffer(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
