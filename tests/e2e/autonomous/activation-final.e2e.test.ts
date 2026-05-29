import { describe, expect, it } from 'vitest';
import { AutonomousSystemController } from '../../../src/ui/modern/AutonomousSystemController';

describe('Final autonomous activation', () => {
  it('validates loading/error/success states and null-safe onboarding', async () => {
    const controller = new AutonomousSystemController();

    expect(controller.getState().onboarding).toBe('idle');

    await expect(
      controller.submitOnboarding({
        productId: '',
        productName: 'Producto Demo',
        audience: 'SMB',
        firstAutomation: 'lead-capture'
      })
    ).rejects.toThrow('productId is required');

    expect(controller.getState().onboarding).toBe('error');
    expect(controller.getState().errorMessage).not.toBeNull();

    await expect(
      controller.submitOnboarding({
        productId: 'autonomous-demo',
        productName: 'Autonomous Demo',
        audience: 'SMB SaaS',
        firstAutomation: 'pipeline-weekly'
      })
    ).resolves.toBeUndefined();

    expect(controller.getState().onboarding).toBe('success');
  });

  it('runs the full integration flow from onboarding to automation', async () => {
    const controller = new AutonomousSystemController();

    const result = await controller.runActivationFlow('customer_activation_1', {
      productId: 'autonomous-product-1',
      productName: 'Autonomous Product 1',
      audience: 'Founders',
      firstAutomation: 'weekly-summary'
    });

    expect(result.productId).toBe('autonomous-product-1');
    expect(result.leadId).toBe('lead_customer_activation_1');
    expect(result.automationPipelineId).toBe('weekly-summary');
    expect(result.checkoutAmount).toBeGreaterThanOrEqual(0);
    expect(result.emittedEvents).toBeGreaterThan(0);

    const state = controller.getState();
    expect(state.dashboard).toBe('success');
    expect(state.checkout).toBe('success');
    expect(state.automation).toBe('success');

    const diagnostics = result.diagnostics;
    expect(diagnostics).toHaveProperty('generatedAt');
    expect(diagnostics).toHaveProperty('metrics');
    expect(diagnostics).toHaveProperty('dashboard');
  });

  it('runs required stress targets without crashes', async () => {
    const controller = new AutonomousSystemController();

    const stress = await controller.runStressSuite({
      events: 1000,
      leads: 100,
      products: 50,
      funnels: 20,
      automations: 10
    });

    expect(stress.events).toBe(1000);
    expect(stress.leads).toBe(100);
    expect(stress.products).toBe(50);
    expect(stress.funnels).toBe(20);
    expect(stress.automations).toBe(10);
    expect(stress.emittedEvents).toBeGreaterThanOrEqual(1000);
    expect(stress.memoryGuardPassed).toBe(true);
  });

  it('activates continuous autonomous mode cycle', async () => {
    const controller = new AutonomousSystemController();
    const cycle = await controller.activateContinuousMode(2);

    expect(cycle.cycles).toBe(2);
    expect(cycle.emittedEvents).toBeGreaterThan(0);
    expect(cycle.alertsEvaluated).toBeGreaterThanOrEqual(0);
  });
});