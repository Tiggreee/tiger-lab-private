import { BotUsageTracker } from './BotUsageTracker';

const PLAN_LIMITS: Record<string, number> = {
  starter: 500,
  pro: 5000,
  enterprise: 25000
};

export class BotQuotaEnforcer {
  constructor(private readonly usageTracker: BotUsageTracker) {}

  public canUse(customerId: string, channel: string, plan: string): boolean {
    const used = this.usageTracker.getUsage(customerId, channel)?.totalMessages || 0;
    const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
    return used < limit;
  }
}
