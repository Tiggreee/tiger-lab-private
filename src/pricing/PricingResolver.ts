import { createEventEnvelope, EventEnvelope } from '../monetization/core/EventEnvelope';
import { InMemoryEventBus } from '../monetization/core/InMemoryEventBus';
import { PricingExperimentManager } from './PricingExperimentManager';
import { PricingRuleEngine } from './PricingRuleEngine';

export interface ResolvedPrice {
  readonly planId: string;
  readonly customerId: string;
  readonly amount: number;
  readonly currency: string;
  readonly reasonCodes: string[];
}

export class PricingResolver {
  constructor(
    private readonly eventBus: InMemoryEventBus,
    private readonly ruleEngine: PricingRuleEngine,
    private readonly experiments: PricingExperimentManager
  ) {}

  public async resolve(customerId: string, planId: string): Promise<ResolvedPrice> {
    const base = this.ruleEngine.resolveBasePrice(planId);
    const experimentResult = this.experiments.applyExperiments(base.basePrice, {
      customerId,
      planId
    });

    const result: ResolvedPrice = {
      planId,
      customerId,
      amount: experimentResult.finalPrice,
      currency: base.currency,
      reasonCodes: [...base.reasonCodes, ...experimentResult.reasonCodes]
    };

    const event: EventEnvelope<Record<string, unknown>> = createEventEnvelope(
      'pricing.resolved',
      'PricingResolver',
      {
        customerId,
        planId,
        amount: result.amount,
        currency: result.currency,
        reasonCodes: result.reasonCodes
      }
    );

    await this.eventBus.publish(event);
    return result;
  }
}
