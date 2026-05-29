import { Publication } from '../../domain/entities/Publication';
import { ContentPublishedEvent } from '../../domain/events/ContentPublishedEvent';
import { PublishContentCommand } from '../ports/in/commands';
import { PublishContentCommandHandler } from '../ports/in/handlers';
import { ContentRepositoryPort } from '../ports/out/repositories';
import { ContentChannelPublisherPort, ContentDomainEventPublisherPort } from '../ports/out/external';

/** Publish content use case. */
export class PublishContentUseCase implements PublishContentCommandHandler {
  constructor(
    private readonly contentRepository: ContentRepositoryPort,
    private readonly channelPublisher: ContentChannelPublisherPort,
    private readonly eventPublisher: ContentDomainEventPublisherPort
  ) {}

  public async execute(command: PublishContentCommand): Promise<void> {
    const asset = await this.contentRepository.findAssetById(command.assetId);
    if (!asset) {
      throw new Error('Cannot publish content that does not exist.');
    }

    await this.channelPublisher.publish(command.channel, asset.body);

    const publication = new Publication(command.publicationId, command.assetId, command.channel);
    await this.contentRepository.savePublication(publication);

    const event = new ContentPublishedEvent({
      publicationId: publication.publicationId,
      assetId: publication.assetId,
      channel: publication.channel
    });

    await this.eventPublisher.publish(event);
  }
}
