import { MetricsRegistry } from './MetricsRegistry';

export class PricingMetrics {
  constructor(private readonly metricsRegistry: MetricsRegistry) {}

  public trackResolvedPrice(planId: string, amount: number): void {
    this.metricsRegistry.increment('pricing.resolved.count', 1, { planId });
    this.metricsRegistry.setGauge(`pricing.plan.${planId}.last_amount`, amount);
  }

  public trackAnomaly(planId: string, amount: number): void {
    this.metricsRegistry.increment('pricing.anomaly.count', 1, { planId });
    this.metricsRegistry.setGauge('pricing.last_anomaly_amount', amount, { planId });
  }

  public snapshot(): Record<string, unknown> {
    return {
      resolvedCount: this.metricsRegistry.getCounter('pricing.resolved.count'),
      anomalyCount: this.metricsRegistry.getCounter('pricing.anomaly.count'),
      lastAnomalyAmount: this.metricsRegistry.getGauge('pricing.last_anomaly_amount')
    };
  }
}
