import { Currency } from './Currency';

/** Money value object. */
export class Money {
  public readonly amount: number;
  public readonly currency: Currency;

  constructor(amount: number, currency: Currency) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error('Money amount must be a non-negative number.');
    }

    this.amount = amount;
    this.currency = currency;
  }
}
