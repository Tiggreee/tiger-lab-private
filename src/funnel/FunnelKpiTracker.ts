export type FunnelStage = 'visit' | 'lead' | 'trial' | 'checkout' | 'paid' | 'provisioned';

export class FunnelKpiTracker {
  private readonly counters = new Map<FunnelStage, number>();

  public track(stage: FunnelStage): void {
    const current = this.counters.get(stage) || 0;
    this.counters.set(stage, current + 1);
  }

  public getCount(stage: FunnelStage): number {
    return this.counters.get(stage) || 0;
  }

  public getConversionRate(from: FunnelStage, to: FunnelStage): number {
    const fromCount = this.getCount(from);
    const toCount = this.getCount(to);
    if (fromCount === 0) {
      return 0;
    }

    return Number((toCount / fromCount).toFixed(4));
  }
}
