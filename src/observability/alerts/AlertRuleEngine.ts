import { MetricsRegistry } from '../metrics/MetricsRegistry';

export interface AlertRuleResult {
  readonly ruleId: string;
  readonly triggered: boolean;
  readonly severity: 'info' | 'warning' | 'critical';
  readonly reason: string;
  readonly context: Record<string, unknown>;
}

export class AlertRuleEngine {
  constructor(private readonly metricsRegistry: MetricsRegistry) {}

  public evaluateConversionDrop(): AlertRuleResult {
    const conversion = this.metricsRegistry.getGauge('funnel.conversion.visit.to.checkout');
    const triggered = conversion > 0 && conversion < 0.15;

    return {
      ruleId: 'funnel-conversion-drop',
      triggered,
      severity: 'critical',
      reason: 'Funnel conversion dropped below minimum threshold.',
      context: { conversion }
    };
  }

  public evaluatePricingAnomaly(): AlertRuleResult {
    const lastAmount = this.metricsRegistry.getGauge('pricing.last_anomaly_amount');
    const anomalyCount = this.metricsRegistry.getCounter('pricing.anomaly.count');
    const triggered = anomalyCount > 0 || lastAmount > 0;

    return {
      ruleId: 'pricing-anomaly',
      triggered,
      severity: 'warning',
      reason: 'Pricing anomaly detected.',
      context: { anomalyCount, lastAmount }
    };
  }

  public evaluateBotOveruse(): AlertRuleResult {
    const overuseCount = this.metricsRegistry.getCounter('bots.overuse.count');

    return {
      ruleId: 'bot-overuse',
      triggered: overuseCount > 0,
      severity: 'warning',
      reason: 'Bot usage exceeds expected quota.',
      context: { overuseCount }
    };
  }

  public evaluateLeadAbsenceByChannel(channels: string[]): AlertRuleResult[] {
    return channels.map((channel) => {
      const leadCount = this.metricsRegistry.getCounter(`lead.created.${channel}.count`);

      return {
        ruleId: `lead-absence-${channel}`,
        triggered: leadCount === 0,
        severity: 'warning' as const,
        reason: 'No new leads detected for channel.',
        context: { channel, leadCount }
      };
    });
  }
}
