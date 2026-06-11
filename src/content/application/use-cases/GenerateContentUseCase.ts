import { ContentAsset } from '../../domain/entities/ContentAsset';
import { ContentGeneratedEvent } from '../../domain/events/ContentGeneratedEvent';
import { ProductId } from '../../../shared/domain/value-objects/ProductId';
import { GenerateContentCommand } from '../ports/in/commands';
import { GenerateContentCommandHandler } from '../ports/in/handlers';
import { ContentRepositoryPort } from '../ports/out/repositories';
import { ContentDomainEventPublisherPort } from '../ports/out/external';

/** Generate content use case. */
export class GenerateContentUseCase implements GenerateContentCommandHandler {
  constructor(
    private readonly contentRepository: ContentRepositoryPort,
    private readonly eventPublisher: ContentDomainEventPublisherPort
  ) {}

  public async execute(command: GenerateContentCommand): Promise<void> {
    const asset = new ContentAsset(command.assetId, new ProductId(command.productId), command.body);
    await this.contentRepository.saveAsset(asset);

    const event = new ContentGeneratedEvent({
      assetId: asset.assetId,
      productId: asset.productId.value()
    });

    await this.eventPublisher.publish(event);
  }
}
