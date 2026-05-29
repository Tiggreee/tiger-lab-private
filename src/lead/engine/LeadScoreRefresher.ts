import { createEventEnvelope, EventEnvelope } from '../../monetization/core/EventEnvelope';
import { InMemoryEventBus } from '../../monetization/core/InMemoryEventBus';
import { CapturedLead } from './LeadCaptureOrchestrator';

export class LeadScoreRefresher {
  constructor(private readonly eventBus: InMemoryEventBus) {}

  public async refresh(lead: CapturedLead, engagementDelta: number): Promise<CapturedLead> {
    const nextScore = Math.max(0, Math.min(100, lead.score + engagementDelta));
    const refreshed: CapturedLead = {
      ...lead,
      score: nextScore
    };

    const event: EventEnvelope<Record<string, unknown>> = createEventEnvelope(
      'lead.scored',
      'LeadScoreRefresher',
      {
        leadId: refreshed.leadId,
        score: refreshed.score
      }
    );

    await this.eventBus.publish(event);
    return refreshed;
  }
}
