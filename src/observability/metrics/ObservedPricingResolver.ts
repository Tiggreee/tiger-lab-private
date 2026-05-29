import { PricingResolver, ResolvedPrice } from '../../pricing/PricingResolver';
import { PricingMetrics } from './PricingMetrics';

export class ObservedPricingResolver {
  constructor(
    private readonly delegate: PricingResolver,
    private readonly pricingMetrics: PricingMetrics
  ) {}

  public async resolve(customerId: string, planId: string): Promise<ResolvedPrice> {
    const result = await this.delegate.resolve(customerId, planId);
    this.pricingMetrics.trackResolvedPrice(planId, result.amount);

    if (result.amount <= 0 || result.amount > 10000) {
      this.pricingMetrics.trackAnomaly(planId, result.amount);
    }

    return result;
  }
}
