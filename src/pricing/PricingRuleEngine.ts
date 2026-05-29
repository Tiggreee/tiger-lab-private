import { CatalogFileRepository } from '../catalog/infrastructure/CatalogFileRepository';

export interface PricingRuleResult {
  readonly planId: string;
  readonly basePrice: number;
  readonly currency: string;
  readonly reasonCodes: string[];
}

export class PricingRuleEngine {
  constructor(private readonly catalogRepository: CatalogFileRepository) {}

  public resolveBasePrice(planId: string): PricingRuleResult {
    const plan = this.catalogRepository.getPlan(planId);
    if (!plan) {
      return {
        planId,
        basePrice: 0,
        currency: 'USD',
        reasonCodes: ['PRICING_PLAN_NOT_FOUND']
      };
    }

    return {
      planId,
      basePrice: plan.priceMonthly,
      currency: plan.currency,
      reasonCodes: ['PRICING_BASE_FROM_CATALOG']
    };
  }
}
