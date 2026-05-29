import { MetricsRegistry } from './MetricsRegistry';

export type FunnelStage = 'visit' | 'lead' | 'trial' | 'checkout' | 'paid' | 'provisioned';

export class FunnelMetrics {
  constructor(private readonly metricsRegistry: MetricsRegistry) {}

  public trackStage(stage: FunnelStage, channel: string): void {
    this.metricsRegistry.increment(`funnel.stage.${stage}.count`, 1, { channel });
  }

  public setConversion(from: FunnelStage, to: FunnelStage, value: number): void {
    this.metricsRegistry.setGauge(`funnel.conversion.${from}.to.${to}`, value);
  }

  public snapshot(): Record<string, unknown> {
    return {
      visit: this.metricsRegistry.getCounter('funnel.stage.visit.count'),
      lead: this.metricsRegistry.getCounter('funnel.stage.lead.count'),
      trial: this.metricsRegistry.getCounter('funnel.stage.trial.count'),
      checkout: this.metricsRegistry.getCounter('funnel.stage.checkout.count'),
      paid: this.metricsRegistry.getCounter('funnel.stage.paid.count'),
      provisioned: this.metricsRegistry.getCounter('funnel.stage.provisioned.count'),
      visitToCheckout: this.metricsRegistry.getGauge('funnel.conversion.visit.to.checkout'),
      checkoutToPaid: this.metricsRegistry.getGauge('funnel.conversion.checkout.to.paid')
    };
  }
}
