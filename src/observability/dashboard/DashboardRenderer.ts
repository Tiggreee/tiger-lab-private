import { MetricsRegistry } from '../metrics/MetricsRegistry';

export interface DashboardPayload {
  readonly generatedAt: string;
  readonly widgets: Array<{
    readonly title: string;
    readonly data: Record<string, unknown>;
  }>;
}

export class DashboardRenderer {
  constructor(private readonly metricsRegistry: MetricsRegistry) {}

  public renderJSON(extraWidgets: Array<{ title: string; data: Record<string, unknown> }> = []): DashboardPayload {
    return {
      generatedAt: new Date().toISOString(),
      widgets: [
        {
          title: 'metrics-overview',
          data: this.metricsRegistry.toJSON()
        },
        ...extraWidgets
      ]
    };
  }
}
