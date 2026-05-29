import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { GenerateContentCommand } from '../../src/content/application/ports/in/commands';
import { bootstrapApplication } from '../../src/shared/infrastructure/bootstrap/app-bootstrap';
import { CliError, handleCliError } from '../shared/cli-error-handler';
import { resolveIdempotencyKey } from '../shared/cli-idempotency';
import { attachIdempotencyKey, createCliContext, logInfo } from '../shared/cli-logger';
import { getBooleanOption, getStringOption, parseCliArgs } from '../shared/cli-parser';

export async function runGenerateContent(argv: string[]): Promise<number> {
  const parsed = parseCliArgs(argv);
  const requestId = getStringOption(parsed, 'request-id');
  const correlationId = getStringOption(parsed, 'correlation-id');

  let context = createCliContext('run-generate-content', requestId, correlationId);

  try {
    const positionalProduct = parsed.positional[0];
    const positionalType = parsed.positional[1] || 'post';
    const positionalChannel = parsed.positional[2] || 'web';

    const productId = getStringOption(parsed, 'product-id') || positionalProduct;
    if (!productId) {
      throw new CliError('INVALID_ARGS', 'Missing product identifier. Use <product> or --product-id');
    }

    const contentType = getStringOption(parsed, 'type', positionalType) || 'post';
    const channel = getStringOption(parsed, 'channel', positionalChannel) || 'web';

    const idempotencyKey = resolveIdempotencyKey({
      command: 'run-generate-content',
      requestId: context.requestId,
      explicitKey: getStringOption(parsed, 'idempotency-key'),
      autoGenerate: getBooleanOption(parsed, 'auto-idempotency')
    });

    context = attachIdempotencyKey(context, idempotencyKey);

    const command: GenerateContentCommand = {
      assetId: getStringOption(parsed, 'asset-id') || `${productId}-${Date.now()}`,
      productId,
      body:
        getStringOption(parsed, 'body') ||
        `Generated ${contentType} content for product ${productId} on channel ${channel}.`
    };

    const { container } = bootstrapApplication();
    await container.generateContentHandler.execute(command);

    logInfo(context, 'Generate content command executed', {
      command,
      metadata: {
        type: contentType,
        channel
      }
    });

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        command: 'generate-content',
        requestId: context.requestId,
        correlationId: context.correlationId,
        idempotencyKey: context.idempotencyKey,
        data: {
          ...command,
          type: contentType,
          channel
        }
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
  void runGenerateContent(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
