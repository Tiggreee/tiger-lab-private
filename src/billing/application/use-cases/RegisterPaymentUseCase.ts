import { Payment } from '../../domain/entities/Payment';
import { PaymentSucceededEvent } from '../../domain/events/PaymentSucceededEvent';
import { Currency } from '../../../../shared/domain/value-objects/Currency';
import { Money } from '../../../../shared/domain/value-objects/Money';
import { PlanId } from '../../../../shared/domain/value-objects/PlanId';
import { ProductId } from '../../../../shared/domain/value-objects/ProductId';
import { RegisterPaymentCommand } from '../ports/in/commands';
import { RegisterPaymentCommandHandler } from '../ports/in/handlers';
import { BillingRepositoryPort } from '../ports/out/repositories';
import { BillingDomainEventPublisherPort, PaymentGatewayPort } from '../ports/out/external';

/** Register payment use case. */
export class RegisterPaymentUseCase implements RegisterPaymentCommandHandler {
  constructor(
    private readonly billingRepository: BillingRepositoryPort,
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly eventPublisher: BillingDomainEventPublisherPort
  ) {}

  public async execute(command: RegisterPaymentCommand): Promise<void> {
    const payment = new Payment(
      command.paymentId,
      command.customerId,
      new ProductId(command.productId),
      new PlanId(command.planId),
      new Money(command.amount, new Currency(command.currency))
    );

    await this.paymentGateway.confirmPayment(payment.paymentId);
    payment.markSucceeded();
    await this.billingRepository.savePayment(payment);

    const event = new PaymentSucceededEvent({
      paymentId: payment.paymentId,
      customerId: payment.customerId,
      productId: payment.productId.value(),
      planId: payment.planId.value()
    });

    await this.eventPublisher.publish(event);
  }
}
