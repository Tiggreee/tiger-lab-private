import { DomainEvent } from '../../../shared/domain/events/DomainEvent';
import { Version } from '../../../shared/domain/value-objects/Version';

export interface ProductCreatedPayload {
  readonly productId: string;
  readonly name: string;
}

/** product.created domain event. */
export class ProductCreatedEvent implements DomainEvent<ProductCreatedPayload> {
  public readonly eventType = 'product.created';
  public readonly occurredAt = new Date();
  public readonly version = new Version('1.0.0');

  constructor(public readonly payload: ProductCreatedPayload) {}
}
