import { CapturedLead } from '../../lead/engine/LeadCaptureOrchestrator';
import { LeadNurturePlan, LeadNurturingSequencer } from '../../lead/engine/LeadNurturingSequencer';
import { MetricsRegistry } from './MetricsRegistry';

export class ObservedLeadNurturingSequencer {
  constructor(
    private readonly delegate: LeadNurturingSequencer,
    private readonly metricsRegistry: MetricsRegistry
  ) {}

  public async assignSequence(lead: CapturedLead): Promise<LeadNurturePlan> {
    const plan = await this.delegate.assignSequence(lead);

    this.metricsRegistry.increment('lead.nurturing.count', 1, {
      sequence: plan.sequence
    });

    this.metricsRegistry.setGauge('lead.last_score', lead.score, {
      leadId: lead.leadId
    });

    return plan;
  }
}
