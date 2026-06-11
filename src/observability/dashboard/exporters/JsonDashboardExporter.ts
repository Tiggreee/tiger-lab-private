import { InMemoryEventBus } from '../../../monetization/core/InMemoryEventBus';
import { BotUsageMetrics } from '../../metrics/BotUsageMetrics';
import { FunnelMetrics } from '../../metrics/FunnelMetrics';
import { PricingMetrics } from '../../metrics/PricingMetrics';
import { DashboardRenderer } from '../DashboardRenderer';

import { DashboardPayload } from '../DashboardRenderer';

export interface DashboardExport {
  readonly funnel: Record<string, unknown>;
  readonly pricing: Record<string, unknown>;
  readonly bots: Record<string, unknown>;
  readonly content: Record<string, unknown>;
  readonly dashboard: DashboardPayload;
}

export class JsonDashboardExporter {
  constructor(
    private readonly renderer: DashboardRenderer,
    private readonly funnelMetrics: FunnelMetrics,
    private readonly pricingMetrics: PricingMetrics,
    private readonly botUsageMetrics: BotUsageMetrics,
    private readonly eventBus: InMemoryEventBus
  ) {}

  public export(): DashboardExport {
    const contentAutopublished = this.eventBus
      .getStream()
      .filter((event) => event.eventType === 'content.autopublished').length;

    const contentGenerated = this.eventBus
      .getStream()
      .filter((event) => event.eventType === 'content.generated').length;

    const contentMetrics = {
      generated: contentGenerated,
      autopublished: contentAutopublished
    };

    return {
      funnel: this.funnelMetrics.snapshot(),
      pricing: this.pricingMetrics.snapshot(),
      bots: this.botUsageMetrics.snapshot(),
      content: contentMetrics,
      dashboard: this.renderer.renderJSON([
        { title: 'funnel-kpis', data: this.funnelMetrics.snapshot() },
        { title: 'pricing-kpis', data: this.pricingMetrics.snapshot() },
        { title: 'bot-usage-kpis', data: this.botUsageMetrics.snapshot() },
        { title: 'content-kpis', data: contentMetrics }
      ])
    };
  }
}
