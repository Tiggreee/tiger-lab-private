import { DomainEvent } from '../../../shared/domain/events/DomainEvent';
import { Version } from '../../../shared/domain/value-objects/Version';

export interface ProductReleasedPayload {
  readonly productId: string;
  readonly version: string;
}

/** product.released domain event. */
export class ProductReleasedEvent implements DomainEvent<ProductReleasedPayload> {
  public readonly eventType = 'product.released';
  public readonly occurredAt = new Date();
  public readonly version = new Version('1.0.0');

  constructor(public readonly payload: ProductReleasedPayload) {}
}
