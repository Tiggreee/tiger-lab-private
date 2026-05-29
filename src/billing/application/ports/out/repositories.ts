import { Payment } from '../../../domain/entities/Payment';
import { ProvisionedAccount } from '../../../domain/entities/ProvisionedAccount';

/** Billing repository output ports. */
export interface BillingRepositoryPort {
  savePayment(payment: Payment): Promise<void>;
  saveProvisionedAccount(account: ProvisionedAccount): Promise<void>;
  findPaymentById(paymentId: string): Promise<Payment | null>;
  findProvisionedAccountById(accountId: string): Promise<ProvisionedAccount | null>;
}
