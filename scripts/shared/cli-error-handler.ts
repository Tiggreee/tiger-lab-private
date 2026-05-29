import { CliContext, logError } from './cli-logger';

export class CliError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly exitCode: number = 1
  ) {
    super(message);
    this.name = 'CliError';
  }
}

export function toCliError(error: unknown): CliError {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof Error) {
    return new CliError('UNEXPECTED_ERROR', error.message, {
      stack: error.stack
    });
  }

  return new CliError('UNEXPECTED_ERROR', 'Unknown CLI error', error);
}

export function handleCliError(context: CliContext, error: unknown): number {
  const normalized = toCliError(error);

  logError(context, normalized.message, {
    code: normalized.code,
    details: normalized.details
  });

  const output = {
    ok: false,
    command: context.command,
    requestId: context.requestId,
    correlationId: context.correlationId,
    idempotencyKey: context.idempotencyKey,
    error: {
      code: normalized.code,
      message: normalized.message,
      details: normalized.details
    }
  };

  process.stderr.write(`${JSON.stringify(output)}\n`);
  return normalized.exitCode;
}
