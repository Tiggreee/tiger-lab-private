import { createEventEnvelope, EventEnvelope } from '../../monetization/core/EventEnvelope';
import { InMemoryEventBus } from '../../monetization/core/InMemoryEventBus';
import { CapturedLead } from './LeadCaptureOrchestrator';

export interface LeadNurturePlan {
  readonly leadId: string;
  readonly sequence: 'education' | 'conversion' | 'sales-handoff';
}

export class LeadNurturingSequencer {
  constructor(private readonly eventBus: InMemoryEventBus) {}

  public async assignSequence(lead: CapturedLead): Promise<LeadNurturePlan> {
    const sequence = lead.score >= 85 ? 'sales-handoff' : lead.score >= 60 ? 'conversion' : 'education';

    const plan: LeadNurturePlan = {
      leadId: lead.leadId,
      sequence
    };

    const event: EventEnvelope<Record<string, unknown>> = createEventEnvelope(
      'lead.nurtured',
      'LeadNurturingSequencer',
      {
        leadId: plan.leadId,
        sequence: plan.sequence
      }
    );

    await this.eventBus.publish(event);
    return plan;
  }
}
