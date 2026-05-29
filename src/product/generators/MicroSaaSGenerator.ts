import { createEventEnvelope, EventEnvelope } from '../../monetization/core/EventEnvelope';
import { InMemoryEventBus } from '../../monetization/core/InMemoryEventBus';
import { CommercialMetadata, GeneratedProductArtifact } from './types';

export class MicroSaaSGenerator {
  constructor(private readonly eventBus: InMemoryEventBus) {}

  public async generate(
    productId: string,
    metadata: CommercialMetadata
  ): Promise<GeneratedProductArtifact> {
    const artifact: GeneratedProductArtifact = {
      productId,
      generatorType: 'micro-saas',
      files: ['README.md', 'app/main.ts', 'billing/plan.json'],
      metadata
    };

    const event: EventEnvelope<Record<string, unknown>> = createEventEnvelope(
      'product.generated',
      'MicroSaaSGenerator',
      {
        productId,
        generatorType: artifact.generatorType,
        plan: metadata.plan,
        files: artifact.files
      }
    );

    await this.eventBus.publish(event);
    return artifact;
  }
}
