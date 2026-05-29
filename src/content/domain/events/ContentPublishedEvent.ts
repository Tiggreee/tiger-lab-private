import { DomainEvent } from '../../../shared/domain/events/DomainEvent';
import { Version } from '../../../shared/domain/value-objects/Version';

export interface ContentPublishedPayload {
  readonly publicationId: string;
  readonly assetId: string;
  readonly channel: string;
}

/** content.published domain event. */
export class ContentPublishedEvent implements DomainEvent<ContentPublishedPayload> {
  public readonly eventType = 'content.published';
  public readonly occurredAt = new Date();
  public readonly version = new Version('1.0.0');

  constructor(public readonly payload: ContentPublishedPayload) {}
}
