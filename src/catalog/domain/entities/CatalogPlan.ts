import { Money } from '../../../shared/domain/value-objects/Money';
import { PlanId } from '../../../shared/domain/value-objects/PlanId';

/** Catalog plan entity. */
export class CatalogPlan {
  public readonly planId: PlanId;
  public readonly name: string;
  public readonly price: Money;
  public readonly validFrom: Date;
  public readonly validTo?: Date;

  constructor(planId: PlanId, name: string, price: Money, validFrom: Date, validTo?: Date) {
    if (!name.trim()) {
      throw new Error('Plan name cannot be empty.');
    }

    if (validTo && validTo <= validFrom) {
      throw new Error('Plan validity window is invalid.');
    }

    this.planId = planId;
    this.name = name;
    this.price = price;
    this.validFrom = validFrom;
    this.validTo = validTo;
  }

  public isActiveAt(at: Date): boolean {
    const starts = at >= this.validFrom;
    const ends = this.validTo ? at <= this.validTo : true;
    return starts && ends;
  }
}
