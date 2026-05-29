import { createEventEnvelope, EventEnvelope } from '../../monetization/core/EventEnvelope';
import { InMemoryEventBus } from '../../monetization/core/InMemoryEventBus';

export interface CapturedLead {
  readonly leadId: string;
  readonly channel: string;
  readonly source: string;
  readonly score: number;
}

export class LeadCaptureOrchestrator {
  constructor(private readonly eventBus: InMemoryEventBus) {}

  public async capture(channel: string, source: string, score = 50): Promise<CapturedLead> {
    const lead: CapturedLead = {
      leadId: `lead_${Math.random().toString(36).slice(2, 10)}`,
      channel,
      source,
      score
    };

    const event: EventEnvelope<Record<string, unknown>> = createEventEnvelope(
      'lead.created',
      'LeadCaptureOrchestrator',
      {
        leadId: lead.leadId,
        source: `${channel}:${source}`
      }
    );

    await this.eventBus.publish(event);
    return lead;
  }
}
