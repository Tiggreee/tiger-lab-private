import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DecideCommercialActionUseCase } from '../../../src/orchestration/application/use-cases/DecideCommercialActionUseCase';
import { bootstrapApplication } from '../../../src/shared/infrastructure/bootstrap/app-bootstrap';

describe('E2E funnel simulation', () => {
  const previousEnv = {
    PAYMENT_GATEWAY_CONFIRM_URL: process.env.PAYMENT_GATEWAY_CONFIRM_URL,
    ENTITLEMENT_API_URL: process.env.ENTITLEMENT_API_URL,
    CONTENT_PUBLISHER_API_URL: process.env.CONTENT_PUBLISHER_API_URL
  };

  beforeEach(() => {
    process.env.PAYMENT_GATEWAY_CONFIRM_URL = 'http://mock.local/payment';
    process.env.ENTITLEMENT_API_URL = 'http://mock.local/entitlement';
    process.env.CONTENT_PUBLISHER_API_URL = 'http://mock.local/content';

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.PAYMENT_GATEWAY_CONFIRM_URL = previousEnv.PAYMENT_GATEWAY_CONFIRM_URL;
    process.env.ENTITLEMENT_API_URL = previousEnv.ENTITLEMENT_API_URL;
    process.env.CONTENT_PUBLISHER_API_URL = previousEnv.CONTENT_PUBLISHER_API_URL;
  });

  it('visit -> lead -> trial -> checkout -> paid -> provisioned', async () => {
    const { container } = bootstrapApplication();
    const orchestration = new DecideCommercialActionUseCase();

    await container.captureLeadHandler.execute({
      leadId: 'lead-funnel-1',
      source: 'web-visit'
    });

    await container.scoreLeadHandler.execute({
      leadId: 'lead-funnel-1',
      score: 82
    });

    const trialDecision = orchestration.execute({
      leadScore: 82,
      requestedProductId: 'facturautentico-cloud',
      catalogAvailablePlans: ['starter', 'pro', 'enterprise'],
      hasSuccessfulPayment: false,
      hasOutstandingInvoice: false
    });

    expect(['send_checkout', 'handoff_to_sales']).toContain(trialDecision.nextAction);

    await container.registerPaymentHandler.execute({
      paymentId: 'pay-funnel-1',
      customerId: 'cust-funnel-1',
      productId: 'facturautentico-cloud',
      planId: trialDecision.recommendedPlan,
      amount: 99,
      currency: 'USD'
    });

    await expect(
      container.provisionAccountHandler.execute({
        accountId: 'acct-funnel-1',
        paymentId: 'pay-funnel-1'
      })
    ).resolves.toBeUndefined();
  });
});
