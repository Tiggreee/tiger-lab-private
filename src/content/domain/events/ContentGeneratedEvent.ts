import { DomainEvent } from '../../../shared/domain/events/DomainEvent';
import { Version } from '../../../shared/domain/value-objects/Version';

export interface ContentGeneratedPayload {
  readonly assetId: string;
  readonly productId: string;
}

/** content.generated domain event. */
export class ContentGeneratedEvent implements DomainEvent<ContentGeneratedPayload> {
  public readonly eventType = 'content.generated';
  public readonly occurredAt = new Date();
  public readonly version = new Version('1.0.0');

  constructor(public readonly payload: ContentGeneratedPayload) {}
}
