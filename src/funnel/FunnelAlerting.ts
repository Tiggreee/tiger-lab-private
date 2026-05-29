import { createEventEnvelope, EventEnvelope } from '../monetization/core/EventEnvelope';
import { InMemoryEventBus } from '../monetization/core/InMemoryEventBus';
import { FunnelKpiTracker, FunnelStage } from './FunnelKpiTracker';

export class FunnelAlerting {
  constructor(private readonly eventBus: InMemoryEventBus, private readonly kpiTracker: FunnelKpiTracker) {}

  public async evaluate(from: FunnelStage, to: FunnelStage, minimumRate: number): Promise<void> {
    const rate = this.kpiTracker.getConversionRate(from, to);
    if (rate >= minimumRate) {
      return;
    }

    const event: EventEnvelope<Record<string, unknown>> = createEventEnvelope(
      'funnel.alerted',
      'FunnelAlerting',
      {
        from,
        to,
        conversionRate: rate,
        minimumRate
      }
    );

    await this.eventBus.publish(event);
  }
}
