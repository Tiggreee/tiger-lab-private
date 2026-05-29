import { createEventEnvelope, EventEnvelope } from '../monetization/core/EventEnvelope';
import { InMemoryEventBus } from '../monetization/core/InMemoryEventBus';
import { PipelineBillingAdapter, PipelineUsageRecord } from './PipelineBillingAdapter';
import { PipelineCatalog } from './PipelineCatalog';

const PLAN_ORDER: Record<string, number> = {
  starter: 1,
  pro: 2,
  enterprise: 3
};

export interface ActivatedPipeline {
  readonly customerId: string;
  readonly pipelineId: string;
  readonly stages: string[];
  readonly billingUsage: PipelineUsageRecord;
}

export class PipelineActivator {
  constructor(
    private readonly eventBus: InMemoryEventBus,
    private readonly pipelineCatalog: PipelineCatalog,
    private readonly billingAdapter: PipelineBillingAdapter
  ) {}

  public async activate(customerId: string, pipelineId: string, plan: string): Promise<ActivatedPipeline> {
    const definition = this.pipelineCatalog.getPipeline(pipelineId);
    if (!definition) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    if ((PLAN_ORDER[plan] || 0) < (PLAN_ORDER[definition.requiredPlan] || 0)) {
      throw new Error(`Plan ${plan} cannot activate pipeline ${pipelineId}`);
    }

    const usageRecord = this.billingAdapter.registerUsage(customerId, pipelineId, definition.stages.length);
    const activated: ActivatedPipeline = {
      customerId,
      pipelineId,
      stages: definition.stages,
      billingUsage: usageRecord
    };

    const event: EventEnvelope<Record<string, unknown>> = createEventEnvelope(
      'automation.executed',
      'PipelineActivator',
      {
        customerId,
        pipelineId,
        units: usageRecord.units
      }
    );

    await this.eventBus.publish(event);
    return activated;
  }
}
