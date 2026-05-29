import { randomUUID } from 'node:crypto';

export interface CliContext {
  readonly command: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly idempotencyKey?: string;
}

interface LogPayload {
  readonly level: 'info' | 'error';
  readonly message: string;
  readonly command: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly idempotencyKey?: string;
  readonly timestamp: string;
  readonly data?: unknown;
}

export function createCliContext(command: string, requestId?: string, correlationId?: string): CliContext {
  const safeRequestId = requestId || randomUUID();

  return {
    command,
    requestId: safeRequestId,
    correlationId: correlationId || safeRequestId
  };
}

export function attachIdempotencyKey(context: CliContext, idempotencyKey?: string): CliContext {
  if (!idempotencyKey) {
    return context;
  }

  return {
    ...context,
    idempotencyKey
  };
}

export function logInfo(context: CliContext, message: string, data?: unknown): void {
  const payload: LogPayload = {
    level: 'info',
    message,
    command: context.command,
    requestId: context.requestId,
    correlationId: context.correlationId,
    idempotencyKey: context.idempotencyKey,
    timestamp: new Date().toISOString(),
    data
  };

  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

export function logError(context: CliContext, message: string, data?: unknown): void {
  const payload: LogPayload = {
    level: 'error',
    message,
    command: context.command,
    requestId: context.requestId,
    correlationId: context.correlationId,
    idempotencyKey: context.idempotencyKey,
    timestamp: new Date().toISOString(),
    data
  };

  process.stderr.write(`${JSON.stringify(payload)}\n`);
}
