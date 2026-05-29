import { BotUsageSnapshot, BotUsageTracker } from '../../bots-as-a-service/BotUsageTracker';
import { BotUsageMetrics } from './BotUsageMetrics';

export class ObservedBotUsageTracker {
  constructor(
    private readonly delegate: BotUsageTracker,
    private readonly botUsageMetrics: BotUsageMetrics
  ) {}

  public track(customerId: string, channel: string, increment = 1): BotUsageSnapshot {
    const snapshot = this.delegate.track(customerId, channel, increment);
    this.botUsageMetrics.trackUsage(customerId, channel, snapshot.totalMessages);

    if (snapshot.totalMessages > 10000) {
      this.botUsageMetrics.trackOveruse(customerId, channel, snapshot.totalMessages);
    }

    return snapshot;
  }

  public getUsage(customerId: string, channel: string): BotUsageSnapshot | null {
    return this.delegate.getUsage(customerId, channel);
  }
}
