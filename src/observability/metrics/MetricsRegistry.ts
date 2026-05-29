export interface MetricSample {
  readonly name: string;
  readonly value: number;
  readonly labels?: Record<string, string>;
  readonly at: string;
}

export class MetricsRegistry {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly samples: MetricSample[] = [];

  public increment(name: string, by = 1, labels?: Record<string, string>): number {
    const current = this.counters.get(name) || 0;
    const next = current + by;
    this.counters.set(name, next);
    this.samples.push({ name, value: next, labels, at: new Date().toISOString() });
    return next;
  }

  public setGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.gauges.set(name, value);
    this.samples.push({ name, value, labels, at: new Date().toISOString() });
  }

  public getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  public getGauge(name: string): number {
    return this.gauges.get(name) || 0;
  }

  public getSamples(): readonly MetricSample[] {
    return this.samples;
  }

  public toJSON(): Record<string, unknown> {
    return {
      counters: Object.fromEntries(this.counters.entries()),
      gauges: Object.fromEntries(this.gauges.entries()),
      samples: this.samples
    };
  }
}
