import { describe, expect, it } from 'vitest';
import { DecideCommercialActionUseCase } from '../../../src/orchestration/application/use-cases/DecideCommercialActionUseCase';

describe('DecideCommercialActionUseCase', () => {
  it('recommends enterprise and handoff for high-intent lead', () => {
    const useCase = new DecideCommercialActionUseCase();

    const result = useCase.execute({
      leadScore: 95,
      requestedProductId: 'facturautentico-cloud',
      catalogAvailablePlans: ['starter', 'pro', 'enterprise'],
      hasSuccessfulPayment: false,
      hasOutstandingInvoice: false
    });

    expect(result.recommendedPlan).toBe('enterprise');
    expect(result.nextAction).toBe('handoff_to_sales');
    expect(result.reasonCodes).toContain('LEAD_HIGH_INTENT');
  });

  it('prioritizes provisioning when payment already succeeded', () => {
    const useCase = new DecideCommercialActionUseCase();

    const result = useCase.execute({
      leadScore: 40,
      requestedProductId: 'facturautentico-cloud',
      catalogAvailablePlans: ['starter', 'pro'],
      hasSuccessfulPayment: true,
      hasOutstandingInvoice: false
    });

    expect(result.nextAction).toBe('provision_account');
    expect(result.reasonCodes).toContain('BILLING_PAYMENT_CONFIRMED');
  });
});
