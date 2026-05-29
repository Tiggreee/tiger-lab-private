import { describe, expect, it } from 'vitest';
import { Payment } from '../../../src/billing/domain/entities/Payment';
import { Currency } from '../../../src/shared/domain/value-objects/Currency';
import { Money } from '../../../src/shared/domain/value-objects/Money';
import { PlanId } from '../../../src/shared/domain/value-objects/PlanId';
import { ProductId } from '../../../src/shared/domain/value-objects/ProductId';

describe('Payment and value object invariants', () => {
  it('normalizes currency and rejects invalid format', () => {
    expect(new Currency('usd').value()).toBe('USD');
    expect(() => new Currency('US')).toThrowError('Currency must be a 3-letter ISO code.');
  });

  it('marks payment as succeeded', () => {
    const payment = new Payment(
      'pay-1',
      'cust-1',
      new ProductId('prod-1'),
      new PlanId('starter'),
      new Money(39, new Currency('USD'))
    );

    expect(payment.isSucceeded()).toBe(false);
    payment.markSucceeded();
    expect(payment.isSucceeded()).toBe(true);
  });
});
