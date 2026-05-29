import { DomainEvent } from '../../../shared/domain/events/DomainEvent';
import { Version } from '../../../shared/domain/value-objects/Version';

export interface CatalogOfferResolvedPayload {
  readonly productId: string;
  readonly planId: string;
}

/** catalog.offer.resolved domain event. */
export class CatalogOfferResolvedEvent implements DomainEvent<CatalogOfferResolvedPayload> {
  public readonly eventType = 'catalog.offer.resolved';
  public readonly occurredAt = new Date();
  public readonly version = new Version('1.0.0');

  constructor(public readonly payload: CatalogOfferResolvedPayload) {}
}
