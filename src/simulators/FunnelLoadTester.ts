import { FunnelOrchestrator } from '../funnel/FunnelOrchestrator';
import { createEventEnvelope } from '../monetization/core/EventEnvelope';
import { InMemoryEventBus } from '../monetization/core/InMemoryEventBus';

export class FunnelLoadTester {
  constructor(
    private readonly eventBus: InMemoryEventBus,
    private readonly funnelOrchestrator: FunnelOrchestrator
  ) {}

  public async run(productId: string, channel: string, iterations: number): Promise<void> {
    for (let index = 0; index < iterations; index += 1) {
      await this.funnelOrchestrator.run(productId, channel);

      await this.eventBus.publish(
        createEventEnvelope('funnel.simulated.checkout', 'FunnelLoadTester', {
          productId,
          channel,
          iteration: index
        })
      );

      await this.eventBus.publish(
        createEventEnvelope('funnel.simulated.trial', 'FunnelLoadTester', {
          productId,
          channel,
          iteration: index
        })
      );
    }
  }
}
