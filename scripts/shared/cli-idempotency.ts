import { createHash, randomUUID } from 'node:crypto';

export interface IdempotencyInput {
  readonly command: string;
  readonly requestId: string;
  readonly explicitKey?: string;
  readonly autoGenerate?: boolean;
}

export function resolveIdempotencyKey(input: IdempotencyInput): string | undefined {
  if (input.explicitKey) {
    return input.explicitKey;
  }

  if (!input.autoGenerate) {
    return undefined;
  }

  const seed = `${input.command}:${input.requestId}:${randomUUID()}`;
  return createHash('sha256').update(seed).digest('hex').slice(0, 32);
}
