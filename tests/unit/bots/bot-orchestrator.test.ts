import { describe, expect, it } from 'vitest';
import { BotOrchestrator } from '../../../bots/engine/BotOrchestrator';

describe('BotOrchestrator', () => {
  it('classifies a high-intent commercial message and recommends enterprise handoff', () => {
    const orchestrator = new BotOrchestrator();

    const output = orchestrator.execute({
      botName: 'SalesBot',
      channel: 'web',
      message: 'I want to buy the enterprise plan, what is the price?',
      customerId: 'CUST-100',
      productId: 'facturautentico-cloud',
      leadScore: 95,
      availablePlans: ['starter', 'pro', 'enterprise']
    });

    expect(output.intent).toBe('commercial');
    expect(output.recommendedPlan).toBe('enterprise');
    expect(output.nextAction).toBe('handoff_to_sales');
    expect(output.reasonCodes).toContain('LEAD_HIGH_INTENT');
    expect(output.responseText).toContain('enterprise');
  });

  it('prioritizes provisioning when payment already succeeded', () => {
    const orchestrator = new BotOrchestrator();

    const output = orchestrator.execute({
      botName: 'ProvisionBot',
      channel: 'internal',
      message: 'checkout completed, please set up my account',
      customerId: 'CUST-200',
      productId: 'docflow-api',
      leadScore: 40,
      hasSuccessfulPayment: true,
      availablePlans: ['starter', 'pro']
    });

    expect(output.nextAction).toBe('provision_account');
    expect(output.reasonCodes).toContain('BILLING_PAYMENT_CONFIRMED');
  });

  it('downgrades to collect_requirements when the channel policy forbids the action', () => {
    const orchestrator = new BotOrchestrator();

    // whatsapp policy does not allow provision_account
    const output = orchestrator.execute({
      botName: 'ProvisionBot',
      channel: 'whatsapp',
      message: 'payment done, provision now',
      customerId: 'CUST-300',
      productId: 'docflow-api',
      leadScore: 30,
      hasSuccessfulPayment: true
    });

    expect(output.channel).toBe('whatsapp');
    expect(output.nextAction).toBe('collect_requirements');
  });

  it('classifies a support message', () => {
    const orchestrator = new BotOrchestrator();

    const output = orchestrator.execute({
      botName: 'IncidentBot',
      channel: 'email',
      message: 'I have an error, the timbrado is failing with a bug',
      customerId: 'CUST-400',
      productId: 'docflow-api',
      leadScore: 20
    });

    expect(output.intent).toBe('support');
  });
});
