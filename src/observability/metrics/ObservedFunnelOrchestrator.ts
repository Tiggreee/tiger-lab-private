import { FunnelExecutionResult, FunnelOrchestrator } from '../../funnel/FunnelOrchestrator';
import { FunnelMetrics } from './FunnelMetrics';

export class ObservedFunnelOrchestrator {
  constructor(
    private readonly delegate: FunnelOrchestrator,
    private readonly funnelMetrics: FunnelMetrics
  ) {}

  public async run(productId: string, channel: string): Promise<FunnelExecutionResult> {
    this.funnelMetrics.trackStage('visit', channel);

    const result = await this.delegate.run(productId, channel);

    this.funnelMetrics.trackStage('lead', channel);
    this.funnelMetrics.trackStage('trial', channel);

    if (result.nextAction === 'send_checkout' || result.nextAction === 'handoff_to_sales') {
      this.funnelMetrics.trackStage('checkout', channel);
    }

    this.funnelMetrics.trackStage('paid', channel);
    this.funnelMetrics.trackStage('provisioned', channel);

    const visit = this.funnelMetrics.snapshot().visit as number;
    const checkout = this.funnelMetrics.snapshot().checkout as number;
    const paid = this.funnelMetrics.snapshot().paid as number;

    const visitToCheckout = visit === 0 ? 0 : Number((checkout / visit).toFixed(4));
    const checkoutToPaid = checkout === 0 ? 0 : Number((paid / checkout).toFixed(4));

    this.funnelMetrics.setConversion('visit', 'checkout', visitToCheckout);
    this.funnelMetrics.setConversion('checkout', 'paid', checkoutToPaid);

    return result;
  }
}
