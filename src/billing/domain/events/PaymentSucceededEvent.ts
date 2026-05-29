import { DomainEvent } from '../../../shared/domain/events/DomainEvent';
import { Version } from '../../../shared/domain/value-objects/Version';

export interface PaymentSucceededPayload {
  readonly paymentId: string;
  readonly customerId: string;
  readonly productId: string;
  readonly planId: string;
}

/** payment.succeeded domain event. */
export class PaymentSucceededEvent implements DomainEvent<PaymentSucceededPayload> {
  public readonly eventType = 'payment.succeeded';
  public readonly occurredAt = new Date();
  public readonly version = new Version('1.0.0');

  constructor(public readonly payload: PaymentSucceededPayload) {}
}
