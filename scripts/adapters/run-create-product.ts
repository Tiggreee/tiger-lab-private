import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { CreateProductCommand } from '../../src/product/application/ports/in/commands';
import { bootstrapApplication } from '../../src/shared/infrastructure/bootstrap/app-bootstrap';
import { CliError, handleCliError } from '../shared/cli-error-handler';
import { resolveIdempotencyKey } from '../shared/cli-idempotency';
import { attachIdempotencyKey, createCliContext, logInfo } from '../shared/cli-logger';
import { getBooleanOption, getStringOption, parseCliArgs } from '../shared/cli-parser';

function normalizeProductId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function runCreateProduct(argv: string[]): Promise<number> {
  const parsed = parseCliArgs(argv);
  const requestId = getStringOption(parsed, 'request-id');
  const correlationId = getStringOption(parsed, 'correlation-id');

  let context = createCliContext('run-create-product', requestId, correlationId);

  try {
    const repo = parsed.positional[0] || getStringOption(parsed, 'repo');
    const fallbackType = parsed.positional[1] || getStringOption(parsed, 'type', 'saas');

    if (!repo && !getStringOption(parsed, 'product-id')) {
      throw new CliError('INVALID_ARGS', 'Missing product source. Use <repo> or --product-id');
    }

    const productId = getStringOption(parsed, 'product-id') || normalizeProductId(repo || randomUUID());
    const name = getStringOption(parsed, 'name') || repo || `Product ${fallbackType}`;

    const idempotencyKey = resolveIdempotencyKey({
      command: 'run-create-product',
      requestId: context.requestId,
      explicitKey: getStringOption(parsed, 'idempotency-key'),
      autoGenerate: getBooleanOption(parsed, 'auto-idempotency')
    });

    context = attachIdempotencyKey(context, idempotencyKey);

    const command: CreateProductCommand = {
      productId,
      name
    };

    const { container } = bootstrapApplication();
    await container.createProductHandler.execute(command);

    logInfo(context, 'Product command executed', {
      command
    });

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        command: 'create-product',
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
  void runCreateProduct(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
