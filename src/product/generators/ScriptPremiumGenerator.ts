import { createEventEnvelope, EventEnvelope } from '../../monetization/core/EventEnvelope';
import { InMemoryEventBus } from '../../monetization/core/InMemoryEventBus';
import { CommercialMetadata, GeneratedProductArtifact } from './types';

export class ScriptPremiumGenerator {
  constructor(private readonly eventBus: InMemoryEventBus) {}

  public async generate(
    productId: string,
    metadata: CommercialMetadata
  ): Promise<GeneratedProductArtifact> {
    const artifact: GeneratedProductArtifact = {
      productId,
      generatorType: 'script-premium',
      files: ['runner.sh', 'automation/config.json', 'docs/quickstart.md'],
      metadata
    };

    const event: EventEnvelope<Record<string, unknown>> = createEventEnvelope(
      'product.generated',
      'ScriptPremiumGenerator',
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
