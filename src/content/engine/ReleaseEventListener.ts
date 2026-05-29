import { EventEnvelope } from '../../monetization/core/EventEnvelope';
import { InMemoryEventBus } from '../../monetization/core/InMemoryEventBus';
import { AutoContentGenerator } from './AutoContentGenerator';
import { AutoPublisher } from './AutoPublisher';

export class ReleaseEventListener {
  constructor(
    private readonly eventBus: InMemoryEventBus,
    private readonly contentGenerator: AutoContentGenerator,
    private readonly autoPublisher: AutoPublisher
  ) {}

  public wire(): void {
    this.eventBus.subscribe('product.released', async (event: EventEnvelope<Record<string, unknown>>) => {
      const productId = String(event.payload.productId || 'unknown-product');
      const version = String(event.payload.version || '0.0.0');

      const content = await this.contentGenerator.generateFromRelease(productId, version);
      await this.autoPublisher.publish(content, ['web', 'email']);
    });
  }
}
