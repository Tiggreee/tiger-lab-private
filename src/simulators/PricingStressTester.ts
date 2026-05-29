import { PricingResolver } from '../pricing/PricingResolver';
import { createEventEnvelope } from '../monetization/core/EventEnvelope';
import { InMemoryEventBus } from '../monetization/core/InMemoryEventBus';

export class PricingStressTester {
  constructor(
    private readonly eventBus: InMemoryEventBus,
    private readonly pricingResolver: PricingResolver
  ) {}

  public async run(customerPrefix: string, planId: string, cycles: number): Promise<void> {
    for (let index = 0; index < cycles; index += 1) {
      const customerId = `${customerPrefix}_${index}`;
      await this.pricingResolver.resolve(customerId, planId);

      await this.eventBus.publish(
        createEventEnvelope('pricing.synthetic.requested', 'PricingStressTester', {
          customerId,
          planId,
          cycle: index
        })
      );
    }
  }
}
