import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Messaging integration with event envelope', () => {
  it('builds an event envelope compatible with schema required fields', () => {
    const schemaPath = resolve(process.cwd(), 'ops/events/schemas/envelope/event-envelope.v1.json');
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8')) as {
      required: string[];
    };

    const eventEnvelope = {
      eventId: 'evt_1',
      eventType: 'lead.created',
      eventVersion: 'v1',
      occurredAt: new Date().toISOString(),
      correlationId: 'corr_1',
      causationId: 'cause_1',
      producer: 'tests.messaging.integration',
      payload: {
        leadId: 'lead_1',
        source: 'web'
      }
    };

    for (const requiredField of schema.required) {
      expect(eventEnvelope).toHaveProperty(requiredField);
    }
  });
});
