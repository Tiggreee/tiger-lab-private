import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/shared/infrastructure/observability/funnel-telemetry', () => ({
  trackFunnelEvent: vi.fn(async () => undefined)
}));

import { BotController } from '../../../server/http/controllers/BotController';

function stubUseCases() {
  const execute = vi.fn(async () => ({}));
  return {
    resolveOffer: { execute } as never,
    captureLead: { execute } as never,
    scoreLead: { execute } as never
  };
}

describe('BotController /bot-query wiring', () => {
  it('computes a real recommendation from the commercial engine for a high-intent lead', async () => {
    const { resolveOffer, captureLead, scoreLead } = stubUseCases();
    const controller = new BotController(resolveOffer, captureLead, scoreLead);

    const response = await controller.botQuery({
      message: 'Quiero contratar el plan enterprise, cual es el precio?',
      productId: 'facturautentico-cloud',
      score: 95,
      dryRun: true
    });

    expect(response.status).toBe('ok');
    expect(response.action).toBe('bot-query');
    // No longer the hardcoded 'start_trial' — it is computed by DecideCommercialActionUseCase.
    expect(response.result.recommendation).toBe('handoff_to_sales');
    expect(response.result.reply.length).toBeGreaterThan(0);
  });

  it('produces a different recommendation for a low-intent lead', async () => {
    const { resolveOffer, captureLead, scoreLead } = stubUseCases();
    const controller = new BotController(resolveOffer, captureLead, scoreLead);

    const response = await controller.botQuery({
      message: 'Solo estoy viendo opciones',
      score: 10,
      dryRun: true
    });

    expect(response.result.recommendation).not.toBe('handoff_to_sales');
    expect(typeof response.result.recommendation).toBe('string');
    expect(response.result.recommendation.length).toBeGreaterThan(0);
  });
});
