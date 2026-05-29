import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { ScoreLeadCommand } from '../../src/lead/application/ports/in/commands';
import { bootstrapApplication } from '../../src/shared/infrastructure/bootstrap/app-bootstrap';
import { handleCliError } from '../shared/cli-error-handler';
import { resolveIdempotencyKey } from '../shared/cli-idempotency';
import { attachIdempotencyKey, createCliContext, logInfo } from '../shared/cli-logger';
import { getBooleanOption, getStringOption, parseCliArgs } from '../shared/cli-parser';

export async function runScoreLead(argv: string[]): Promise<number> {
  const parsed = parseCliArgs(argv);
  const requestId = getStringOption(parsed, 'request-id');
  const correlationId = getStringOption(parsed, 'correlation-id');

  let context = createCliContext('run-score-lead', requestId, correlationId);

  try {
    const rawScore = getStringOption(parsed, 'score', parsed.positional[1] || '50') || '50';
    const score = Number(rawScore);

    const idempotencyKey = resolveIdempotencyKey({
      command: 'run-score-lead',
      requestId: context.requestId,
      explicitKey: getStringOption(parsed, 'idempotency-key'),
      autoGenerate: getBooleanOption(parsed, 'auto-idempotency')
    });

    context = attachIdempotencyKey(context, idempotencyKey);

    const command: ScoreLeadCommand = {
      leadId: getStringOption(parsed, 'lead-id', parsed.positional[0]) || `lead-${randomUUID().slice(0, 12)}`,
      score: Number.isFinite(score) ? score : 50
    };

    const { container } = bootstrapApplication();
    await container.scoreLeadHandler.execute(command);

    logInfo(context, 'Score lead command executed', {
      command
    });

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        command: 'score-lead',
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
  void runScoreLead(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
