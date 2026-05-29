import { ProvisionedAccount } from '../../domain/entities/ProvisionedAccount';
import { AccountProvisionedEvent } from '../../domain/events/AccountProvisionedEvent';
import { ProvisionAccountCommand } from '../ports/in/commands';
import { ProvisionAccountCommandHandler } from '../ports/in/handlers';
import { BillingRepositoryPort } from '../ports/out/repositories';
import { ApiKeyPort, BillingDomainEventPublisherPort, EntitlementPort } from '../ports/out/external';

/** Provision account use case. */
export class ProvisionAccountUseCase implements ProvisionAccountCommandHandler {
  constructor(
    private readonly billingRepository: BillingRepositoryPort,
    private readonly entitlementPort: EntitlementPort,
    private readonly apiKeyPort: ApiKeyPort,
    private readonly eventPublisher: BillingDomainEventPublisherPort
  ) {}

  public async execute(command: ProvisionAccountCommand): Promise<void> {
    const payment = await this.billingRepository.findPaymentById(command.paymentId);
    if (!payment || !payment.isSucceeded()) {
      throw new Error('Cannot provision account without a valid payment.');
    }

    const account = ProvisionedAccount.fromSucceededPayment(command.accountId, payment);

    await this.entitlementPort.grantEntitlements(
      account.accountId,
      account.productId.value(),
      account.planId.value()
    );

    await this.apiKeyPort.createApiKey(account.accountId);
    await this.billingRepository.saveProvisionedAccount(account);

    const event = new AccountProvisionedEvent({
      accountId: account.accountId,
      customerId: account.customerId,
      productId: account.productId.value(),
      planId: account.planId.value()
    });

    await this.eventPublisher.publish(event);
  }
}
