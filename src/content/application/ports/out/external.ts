import { DomainEvent } from '../../../../shared/domain/events/DomainEvent';

/** Content external service output ports. */
export interface ContentTemplateStoragePort {
  loadTemplate(productId: string): Promise<string>;
}

export interface ContentChannelPublisherPort {
  publish(channel: string, body: string): Promise<void>;
}

export interface ContentDomainEventPublisherPort {
  publish(event: DomainEvent<unknown>): Promise<void>;
}
