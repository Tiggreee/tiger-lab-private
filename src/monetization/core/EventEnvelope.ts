export interface EventEnvelope<TPayload extends Record<string, unknown>> {
  readonly eventId: string;
  readonly eventType: string;
  readonly eventVersion: 'v1';
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly producer: string;
  readonly payload: TPayload;
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEventEnvelope<TPayload extends Record<string, unknown>>(
  eventType: string,
  producer: string,
  payload: TPayload,
  correlationId?: string,
  causationId?: string
): EventEnvelope<TPayload> {
  const eventId = randomId('evt');
  const resolvedCorrelationId = correlationId || randomId('corr');

  return {
    eventId,
    eventType,
    eventVersion: 'v1',
    occurredAt: new Date().toISOString(),
    correlationId: resolvedCorrelationId,
    causationId: causationId || resolvedCorrelationId,
    producer,
    payload
  };
}
