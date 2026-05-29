import { Money } from '../../../shared/domain/value-objects/Money';
import { PlanId } from '../../../shared/domain/value-objects/PlanId';
import { ProductId } from '../../../shared/domain/value-objects/ProductId';

export type PaymentStatus = 'pending' | 'succeeded';

/** Payment entity. */
export class Payment {
  public readonly paymentId: string;
  public readonly customerId: string;
  public readonly productId: ProductId;
  public readonly planId: PlanId;
  public readonly amount: Money;
  public readonly createdAt: Date;
  private status: PaymentStatus;

  constructor(
    paymentId: string,
    customerId: string,
    productId: ProductId,
    planId: PlanId,
    amount: Money,
    createdAt = new Date()
  ) {
    if (!paymentId.trim()) {
      throw new Error('Payment ID cannot be empty.');
    }

    if (!customerId.trim()) {
      throw new Error('Customer ID cannot be empty.');
    }

    this.paymentId = paymentId;
    this.customerId = customerId;
    this.productId = productId;
    this.planId = planId;
    this.amount = amount;
    this.createdAt = createdAt;
    this.status = 'pending';
  }

  public markSucceeded(): void {
    this.status = 'succeeded';
  }

  public isSucceeded(): boolean {
    return this.status === 'succeeded';
  }
}
