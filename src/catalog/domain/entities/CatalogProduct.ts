import { ProductId } from '../../../shared/domain/value-objects/ProductId';
import { PlanId } from '../../../shared/domain/value-objects/PlanId';
import { CatalogPlan } from './CatalogPlan';

/** Catalog product entity. */
export class CatalogProduct {
  public readonly productId: ProductId;
  public readonly name: string;
  private readonly plans: CatalogPlan[];

  constructor(productId: ProductId, name: string, plans: CatalogPlan[]) {
    if (!name.trim()) {
      throw new Error('Catalog product name cannot be empty.');
    }

    if (plans.length === 0) {
      throw new Error('Catalog product must have at least one plan.');
    }

    this.productId = productId;
    this.name = name;
    this.plans = plans;
  }

  public resolvePlan(planId: PlanId, at: Date): CatalogPlan {
    const plan = this.plans.find((item) => item.planId.value() === planId.value());
    if (!plan) {
      throw new Error('Plan does not exist for selected product.');
    }

    if (!plan.isActiveAt(at)) {
      throw new Error('Plan exists but is not currently valid.');
    }

    return plan;
  }
}
