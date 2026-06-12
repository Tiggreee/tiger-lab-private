export interface MarketSignal {
  readonly source: 'direct' | 'inbound' | 'social' | 'support' | 'competitor';
  readonly topic: string;
  readonly intent: string;
  readonly frequency: number;
  readonly urgency: 'low' | 'medium' | 'high';
  readonly timestamp: Date;
}

export interface MarketOpportunity {
  readonly concept: string;
  readonly segment: string;
  readonly painPoint: string;
  readonly willingnessToPay: number;
  readonly competitiveGap: string;
  readonly estimatedDemand: 'low' | 'medium' | 'high';
  readonly confidence: number;
}

export class MarketResearcher {
  private readonly signals: MarketSignal[] = [];
  private readonly opportunities: MarketOpportunity[] = [];

  public ingestSignal(signal: MarketSignal): void {
    this.signals.push(signal);
  }

  public analyze(segment: string): MarketOpportunity[] {
    const relevant = this.signals.filter(
      (s) => s.urgency === 'high' && s.frequency >= 2
    );

    if (relevant.length === 0) {
      return [];
    }

    const opportunities: MarketOpportunity[] = relevant.map((signal) => ({
      concept: `${signal.topic} for ${segment}`,
      segment,
      painPoint: signal.intent,
      willingnessToPay: signal.urgency === 'high' ? 99 : 39,
      competitiveGap: signal.topic,
      estimatedDemand: signal.frequency > 5 ? 'high' : signal.frequency > 2 ? 'medium' : 'low',
      confidence: Math.min(signal.frequency / 10, 1),
    }));

    this.opportunities.push(...opportunities);
    return opportunities;
  }

  public getTopOpportunity(): MarketOpportunity | null {
    const sorted = [...this.opportunities].sort(
      (a, b) => b.confidence * this.weight(b) - a.confidence * this.weight(a)
    );
    return sorted[0] || null;
  }

  private weight(opp: MarketOpportunity): number {
    const demandWeight = { high: 3, medium: 2, low: 1 };
    return (demandWeight[opp.estimatedDemand] || 1) * opp.willingnessToPay;
  }

  public getSignalCount(): number {
    return this.signals.length;
  }

  public getOpportunityCount(): number {
    return this.opportunities.length;
  }
}
