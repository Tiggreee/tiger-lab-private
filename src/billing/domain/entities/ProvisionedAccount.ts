import { PlanId } from '../../../shared/domain/value-objects/PlanId';
import { ProductId } from '../../../shared/domain/value-objects/ProductId';
import { Payment } from './Payment';

/** Provisioned account entity. */
export class ProvisionedAccount {
  public readonly accountId: string;
  public readonly customerId: string;
  public readonly productId: ProductId;
  public readonly planId: PlanId;
  public readonly provisionedAt: Date;

  constructor(
    accountId: string,
    customerId: string,
    productId: ProductId,
    planId: PlanId,
    provisionedAt = new Date()
  ) {
    if (!accountId.trim()) {
      throw new Error('Account ID cannot be empty.');
    }

    if (!customerId.trim()) {
      throw new Error('Customer ID cannot be empty.');
    }

    this.accountId = accountId;
    this.customerId = customerId;
    this.productId = productId;
    this.planId = planId;
    this.provisionedAt = provisionedAt;
  }

  public static fromSucceededPayment(accountId: string, payment: Payment): ProvisionedAccount {
    if (!payment.isSucceeded()) {
      throw new Error('Cannot provision account without a valid succeeded payment.');
    }

    return new ProvisionedAccount(accountId, payment.customerId, payment.productId, payment.planId);
  }
}
