import { DomainEvent } from '../../../shared/domain/events/DomainEvent';
import { Version } from '../../../shared/domain/value-objects/Version';

export interface AccountProvisionedPayload {
  readonly accountId: string;
  readonly customerId: string;
  readonly productId: string;
  readonly planId: string;
}

/** account.provisioned domain event. */
export class AccountProvisionedEvent implements DomainEvent<AccountProvisionedPayload> {
  public readonly eventType = 'account.provisioned';
  public readonly occurredAt = new Date();
  public readonly version = new Version('1.0.0');

  constructor(public readonly payload: AccountProvisionedPayload) {}
}
