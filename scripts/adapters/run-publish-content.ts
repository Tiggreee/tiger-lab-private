import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { PublishContentCommand } from '../../src/content/application/ports/in/commands';
import { bootstrapApplication } from '../../src/shared/infrastructure/bootstrap/app-bootstrap';
import { CliError, handleCliError } from '../shared/cli-error-handler';
import { resolveIdempotencyKey } from '../shared/cli-idempotency';
import { attachIdempotencyKey, createCliContext, logInfo } from '../shared/cli-logger';
import { getBooleanOption, getStringOption, parseCliArgs } from '../shared/cli-parser';

export async function runPublishContent(argv: string[]): Promise<number> {
  const parsed = parseCliArgs(argv);
  const requestId = getStringOption(parsed, 'request-id');
  const correlationId = getStringOption(parsed, 'correlation-id');

  let context = createCliContext('run-publish-content', requestId, correlationId);

  try {
    const positionalAssetRef = parsed.positional[0];
    const positionalChannel = parsed.positional[1] || 'web';

    const assetId = getStringOption(parsed, 'asset-id') || positionalAssetRef;
    if (!assetId) {
      throw new CliError('INVALID_ARGS', 'Missing asset reference. Use <file> or --asset-id');
    }

    const channel = getStringOption(parsed, 'channel', positionalChannel) || 'web';

    const idempotencyKey = resolveIdempotencyKey({
      command: 'run-publish-content',
      requestId: context.requestId,
      explicitKey: getStringOption(parsed, 'idempotency-key'),
      autoGenerate: getBooleanOption(parsed, 'auto-idempotency')
    });

    context = attachIdempotencyKey(context, idempotencyKey);

    const command: PublishContentCommand = {
      publicationId: getStringOption(parsed, 'publication-id') || `pub-${Date.now()}-${randomUUID().slice(0, 8)}`,
      assetId,
      channel
    };

    const { container } = bootstrapApplication();
    await container.publishContentHandler.execute(command);

    logInfo(context, 'Publish content command executed', {
      command
    });

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        command: 'publish-content',
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
  void runPublishContent(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
