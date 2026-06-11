import { DomainEvent } from '../../../../shared/domain/events/DomainEvent';

/** Billing external service output ports. */
export interface PaymentGatewayPort {
  confirmPayment(paymentId: string): Promise<void>;
}

export interface EntitlementPort {
  grantEntitlements(accountId: string, productId: string, planId: string): Promise<void>;
}

export interface ApiKeyPort {
  createApiKey(accountId: string): Promise<string>;
}

export interface BillingQueuePort {
  enqueue(paymentId: string): Promise<void>;
}

export interface BillingDomainEventPublisherPort {
  publish(event: DomainEvent<unknown>): Promise<void>;
}
