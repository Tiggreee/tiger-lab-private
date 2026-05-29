import { CatalogFileRepository } from '../catalog/infrastructure/CatalogFileRepository';
import { LeadCaptureOrchestrator } from '../lead/engine/LeadCaptureOrchestrator';
import { LeadNurturingSequencer } from '../lead/engine/LeadNurturingSequencer';
import { LeadScoreRefresher } from '../lead/engine/LeadScoreRefresher';
import { InMemoryEventBus } from '../monetization/core/InMemoryEventBus';
import { DecideCommercialActionUseCase } from '../orchestration/application/use-cases/DecideCommercialActionUseCase';
import { FunnelAlerting } from './FunnelAlerting';
import { FunnelKpiTracker } from './FunnelKpiTracker';

export interface FunnelExecutionResult {
  readonly leadId: string;
  readonly recommendedPlan: string;
  readonly nextAction: string;
  readonly nurtureSequence: string;
}

export class FunnelOrchestrator {
  constructor(
    private readonly eventBus: InMemoryEventBus,
    private readonly leadCapture: LeadCaptureOrchestrator,
    private readonly leadRefresher: LeadScoreRefresher,
    private readonly nurturingSequencer: LeadNurturingSequencer,
    private readonly commercialDecision: DecideCommercialActionUseCase,
    private readonly catalogRepository: CatalogFileRepository,
    private readonly kpiTracker: FunnelKpiTracker,
    private readonly alerting: FunnelAlerting
  ) {
    void this.eventBus;
  }

  public async run(productId: string, channel: string): Promise<FunnelExecutionResult> {
    this.kpiTracker.track('visit');

    const lead = await this.leadCapture.capture(channel, 'funnel', 58);
    this.kpiTracker.track('lead');

    const refreshedLead = await this.leadRefresher.refresh(lead, 17);
    this.kpiTracker.track('trial');

    const availablePlans = ['starter', 'pro', 'enterprise'].filter((planId) =>
      this.catalogRepository.isAvailableForChannel(productId, planId, channel)
    );

    const decision = this.commercialDecision.execute({
      leadScore: refreshedLead.score,
      requestedProductId: productId,
      catalogAvailablePlans: availablePlans.length > 0 ? availablePlans : ['starter'],
      hasSuccessfulPayment: false,
      hasOutstandingInvoice: false,
      customerSegment: refreshedLead.score >= 60 ? 'existing' : 'new'
    });

    if (decision.nextAction === 'send_checkout' || decision.nextAction === 'handoff_to_sales') {
      this.kpiTracker.track('checkout');
    }

    const nurturePlan = await this.nurturingSequencer.assignSequence(refreshedLead);

    this.kpiTracker.track('paid');
    this.kpiTracker.track('provisioned');

    await this.alerting.evaluate('visit', 'checkout', 0.2);

    return {
      leadId: refreshedLead.leadId,
      recommendedPlan: decision.recommendedPlan,
      nextAction: decision.nextAction,
      nurtureSequence: nurturePlan.sequence
    };
  }
}
