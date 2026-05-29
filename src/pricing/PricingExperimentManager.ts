export interface PricingExperimentContext {
  readonly customerId: string;
  readonly planId: string;
}

export class PricingExperimentManager {
  private readonly flags = new Map<string, boolean>();

  public setFlag(flagName: string, enabled: boolean): void {
    this.flags.set(flagName, enabled);
  }

  public applyExperiments(basePrice: number, context: PricingExperimentContext): { finalPrice: number; reasonCodes: string[] } {
    const reasonCodes: string[] = ['PRICING_EXPERIMENTS_EVALUATED'];

    if (this.flags.get('pricing.discount10') && context.planId === 'pro') {
      return {
        finalPrice: Number((basePrice * 0.9).toFixed(2)),
        reasonCodes: [...reasonCodes, 'PRICING_EXPERIMENT_DISCOUNT10']
      };
    }

    return {
      finalPrice: basePrice,
      reasonCodes
    };
  }
}
