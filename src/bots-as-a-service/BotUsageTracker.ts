export interface BotUsageSnapshot {
  readonly customerId: string;
  readonly channel: string;
  readonly totalMessages: number;
}

export class BotUsageTracker {
  private readonly usage = new Map<string, BotUsageSnapshot>();

  public track(customerId: string, channel: string, increment = 1): BotUsageSnapshot {
    const key = `${customerId}:${channel}`;
    const current = this.usage.get(key);

    const snapshot: BotUsageSnapshot = {
      customerId,
      channel,
      totalMessages: (current?.totalMessages || 0) + increment
    };

    this.usage.set(key, snapshot);
    return snapshot;
  }

  public getUsage(customerId: string, channel: string): BotUsageSnapshot | null {
    return this.usage.get(`${customerId}:${channel}`) || null;
  }
}
