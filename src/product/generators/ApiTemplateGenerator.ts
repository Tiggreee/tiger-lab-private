import { createEventEnvelope, EventEnvelope } from '../../monetization/core/EventEnvelope';
import { InMemoryEventBus } from '../../monetization/core/InMemoryEventBus';
import { CommercialMetadata, GeneratedProductArtifact } from './types';

export class ApiTemplateGenerator {
  constructor(private readonly eventBus: InMemoryEventBus) {}

  public async generate(
    productId: string,
    metadata: CommercialMetadata
  ): Promise<GeneratedProductArtifact> {
    const artifact: GeneratedProductArtifact = {
      productId,
      generatorType: 'api-template',
      files: ['openapi.json', 'src/routes.ts', 'src/handlers.ts'],
      metadata
    };

    const event: EventEnvelope<Record<string, unknown>> = createEventEnvelope(
      'product.generated',
      'ApiTemplateGenerator',
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
