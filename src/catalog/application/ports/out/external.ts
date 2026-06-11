import { DomainEvent } from '../../../../shared/domain/events/DomainEvent';

/** Catalog external service output ports. */
export interface PricingPolicyPort {
  resolvePrice(productId: string, planId: string): Promise<number>;
}

export interface CatalogStoragePort {
  read(): Promise<string>;
  write(content: string): Promise<void>;
}

export interface CatalogAvailabilityApiPort {
  checkAvailability(productId: string, planId: string): Promise<boolean>;
}

export interface CatalogDomainEventPublisherPort {
  publish(event: DomainEvent<unknown>): Promise<void>;
}
