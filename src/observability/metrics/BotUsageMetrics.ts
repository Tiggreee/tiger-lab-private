import { MetricsRegistry } from './MetricsRegistry';

export class BotUsageMetrics {
  constructor(private readonly metricsRegistry: MetricsRegistry) {}

  public trackUsage(customerId: string, channel: string, totalMessages: number): void {
    this.metricsRegistry.increment('bots.usage.events', 1, { customerId, channel });
    this.metricsRegistry.setGauge(`bots.usage.${customerId}.${channel}.total_messages`, totalMessages);
    this.metricsRegistry.setGauge('bots.usage.last_total_messages', totalMessages, { customerId, channel });
  }

  public trackOveruse(customerId: string, channel: string, totalMessages: number): void {
    this.metricsRegistry.increment('bots.overuse.count', 1, { customerId, channel });
    this.metricsRegistry.setGauge('bots.overuse.last_total_messages', totalMessages, { customerId, channel });
  }

  public snapshot(): Record<string, unknown> {
    return {
      usageEvents: this.metricsRegistry.getCounter('bots.usage.events'),
      overuseCount: this.metricsRegistry.getCounter('bots.overuse.count'),
      lastTotalMessages: this.metricsRegistry.getGauge('bots.usage.last_total_messages')
    };
  }
}
