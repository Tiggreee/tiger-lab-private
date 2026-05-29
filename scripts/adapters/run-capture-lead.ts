import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { CaptureLeadCommand } from '../../src/lead/application/ports/in/commands';
import { bootstrapApplication } from '../../src/shared/infrastructure/bootstrap/app-bootstrap';
import { handleCliError } from '../shared/cli-error-handler';
import { resolveIdempotencyKey } from '../shared/cli-idempotency';
import { attachIdempotencyKey, createCliContext, logInfo } from '../shared/cli-logger';
import { getBooleanOption, getStringOption, parseCliArgs } from '../shared/cli-parser';

export async function runCaptureLead(argv: string[]): Promise<number> {
  const parsed = parseCliArgs(argv);
  const requestId = getStringOption(parsed, 'request-id');
  const correlationId = getStringOption(parsed, 'correlation-id');

  let context = createCliContext('run-capture-lead', requestId, correlationId);

  try {
    const source = getStringOption(parsed, 'source', parsed.positional[0] || 'unknown') || 'unknown';

    const idempotencyKey = resolveIdempotencyKey({
      command: 'run-capture-lead',
      requestId: context.requestId,
      explicitKey: getStringOption(parsed, 'idempotency-key'),
      autoGenerate: getBooleanOption(parsed, 'auto-idempotency')
    });

    context = attachIdempotencyKey(context, idempotencyKey);

    const command: CaptureLeadCommand = {
      leadId: getStringOption(parsed, 'lead-id') || `lead-${Date.now()}-${randomUUID().slice(0, 8)}`,
      source
    };

    const { container } = bootstrapApplication();
    await container.captureLeadHandler.execute(command);

    logInfo(context, 'Capture lead command executed', {
      command
    });

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        command: 'capture-lead',
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
  void runCaptureLead(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
