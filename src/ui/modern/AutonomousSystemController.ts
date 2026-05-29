import { createEventEnvelope } from '../../monetization/core/EventEnvelope';
import { createMonetizationRuntime, MonetizationRuntime } from '../../monetization/MonetizationRuntime';
import { createHardeningRuntime, HardeningRuntime } from '../../hardening/HardeningRuntime';
import { bootstrapApplication } from '../../shared/infrastructure/bootstrap/app-bootstrap';
import { DependencyContainer } from '../../shared/infrastructure/bootstrap/dependency-container';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface OnboardingInput {
  readonly productId: string;
  readonly productName: string;
  readonly audience: string;
  readonly firstAutomation: string;
}

export interface ActivationFlowResult {
  readonly productId: string;
  readonly leadId: string;
  readonly recommendedPlan: string;
  readonly checkoutAmount: number;
  readonly automationPipelineId: string;
  readonly diagnostics: Record<string, unknown>;
  readonly emittedEvents: number;
}

export interface StressTargets {
  readonly events: number;
  readonly leads: number;
  readonly products: number;
  readonly funnels: number;
  readonly automations: number;
}

export interface StressResult extends StressTargets {
  readonly emittedEvents: number;
  readonly memoryDeltaBytes: number;
  readonly memoryGuardPassed: boolean;
}

export interface ContinuousCycleResult {
  readonly cycles: number;
  readonly emittedEvents: number;
  readonly alertsEvaluated: number;
}

export interface UiOperationState {
  readonly onboarding: AsyncStatus;
  readonly dashboard: AsyncStatus;
  readonly checkout: AsyncStatus;
  readonly automation: AsyncStatus;
  readonly errorMessage: string | null;
}

const DEFAULT_STRESS_TARGETS: StressTargets = {
  events: 1000,
  leads: 100,
  products: 50,
  funnels: 20,
  automations: 10
};

function ensureNonEmpty(value: string, fieldName: string): void {
  if (!value || value.trim().length === 0) {
    throw new Error(`Invalid input: ${fieldName} is required`);
  }
}

export class AutonomousSystemController {
  private readonly container: DependencyContainer;
  private readonly runtime: MonetizationRuntime;
  private readonly hardening: HardeningRuntime;
  private state: UiOperationState = {
    onboarding: 'idle',
    dashboard: 'idle',
    checkout: 'idle',
    automation: 'idle',
    errorMessage: null
  };

  constructor() {
    this.container = bootstrapApplication().container;
    this.runtime = createMonetizationRuntime();
    this.hardening = createHardeningRuntime();
  }

  public getState(): UiOperationState {
    return { ...this.state };
  }

  public async submitOnboarding(input: OnboardingInput): Promise<void> {
    this.state = { ...this.state, onboarding: 'loading', errorMessage: null };

    try {
      ensureNonEmpty(input.productId, 'productId');
      ensureNonEmpty(input.productName, 'productName');
      ensureNonEmpty(input.audience, 'audience');
      ensureNonEmpty(input.firstAutomation, 'firstAutomation');

      await this.container.createProductHandler.execute({
        productId: input.productId,
        name: input.productName
      });

      this.state = { ...this.state, onboarding: 'success' };
    } catch (error) {
      this.state = {
        ...this.state,
        onboarding: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown onboarding error'
      };
      throw error;
    }
  }

  public async runActivationFlow(customerId: string, onboarding: OnboardingInput): Promise<ActivationFlowResult> {
    ensureNonEmpty(customerId, 'customerId');
    await this.submitOnboarding(onboarding);

    this.state = { ...this.state, dashboard: 'loading', checkout: 'loading', automation: 'loading', errorMessage: null };
    const beforeEvents = this.runtime.eventBus.getStream().length;

    try {
      await this.container.generateContentHandler.execute({
        assetId: `asset_${onboarding.productId}`,
        productId: onboarding.productId,
        body: `Audience: ${onboarding.audience}. First automation: ${onboarding.firstAutomation}.`
      });

      await this.container.publishContentHandler.execute({
        publicationId: `pub_${onboarding.productId}`,
        assetId: `asset_${onboarding.productId}`,
        channel: 'web'
      });

      const leadId = `lead_${customerId}`;
      await this.container.captureLeadHandler.execute({
        leadId,
        source: 'ui:onboarding'
      });

      await this.container.scoreLeadHandler.execute({
        leadId,
        score: 78
      });

      const funnel = await this.runtime.funnelOrchestrator.run('facturautentico-cloud', 'web');
      const resolvedPrice = await this.runtime.pricingResolver.resolve(customerId, funnel.recommendedPlan);

      const paymentId = `pay_${customerId}`;
      const accountId = `acct_${customerId}`;
      await this.container.registerPaymentHandler.execute({
        paymentId,
        customerId,
        productId: onboarding.productId,
        planId: funnel.recommendedPlan,
        amount: resolvedPrice.amount,
        currency: resolvedPrice.currency
      });

      await this.container.provisionAccountHandler.execute({
        accountId,
        paymentId
      });

      const planForPipeline = funnel.recommendedPlan === 'enterprise' ? 'enterprise' : funnel.recommendedPlan === 'pro' ? 'pro' : 'starter';
      const activated = await this.runtime.pipelineActivator.activate(customerId, 'weekly-summary', planForPipeline);

      const diagnostics = this.hardening.runDiagnostics();
      this.state = { ...this.state, dashboard: 'success', checkout: 'success', automation: 'success' };

      return {
        productId: onboarding.productId,
        leadId,
        recommendedPlan: funnel.recommendedPlan,
        checkoutAmount: resolvedPrice.amount,
        automationPipelineId: activated.pipelineId,
        diagnostics,
        emittedEvents: this.runtime.eventBus.getStream().length - beforeEvents
      };
    } catch (error) {
      this.state = {
        ...this.state,
        dashboard: 'error',
        checkout: 'error',
        automation: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown activation flow error'
      };
      throw error;
    }
  }

  public loadDashboard(): Record<string, unknown> {
    this.state = { ...this.state, dashboard: 'loading', errorMessage: null };

    try {
      const diagnostics = this.hardening.runDiagnostics();
      this.state = { ...this.state, dashboard: 'success' };
      return diagnostics;
    } catch (error) {
      this.state = {
        ...this.state,
        dashboard: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown dashboard error'
      };
      throw error;
    }
  }

  public async runStressSuite(targets: Partial<StressTargets> = {}): Promise<StressResult> {
    const merged: StressTargets = {
      ...DEFAULT_STRESS_TARGETS,
      ...targets
    };

    const startEvents = this.runtime.eventBus.getStream().length;
    const memoryBefore = process.memoryUsage().heapUsed;

    for (let index = 0; index < merged.events; index += 1) {
      await this.runtime.eventBus.publish(
        createEventEnvelope('stress.synthetic', 'AutonomousSystemController', {
          seq: index
        })
      );
    }

    for (let index = 0; index < merged.leads; index += 1) {
      const leadId = `stress_lead_${index}`;
      await this.container.captureLeadHandler.execute({
        leadId,
        source: 'stress:web'
      });
      await this.container.scoreLeadHandler.execute({
        leadId,
        score: 40 + (index % 60)
      });
    }

    for (let index = 0; index < merged.products; index += 1) {
      await this.container.createProductHandler.execute({
        productId: `stress_product_${index}`,
        name: `Stress Product ${index}`
      });
    }

    for (let index = 0; index < merged.funnels; index += 1) {
      await this.runtime.funnelOrchestrator.run('facturautentico-cloud', 'web');
    }

    for (let index = 0; index < merged.automations; index += 1) {
      await this.runtime.pipelineActivator.activate(`stress_customer_${index}`, 'weekly-summary', 'starter');
    }

    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryDeltaBytes = memoryAfter - memoryBefore;
    const emittedEvents = this.runtime.eventBus.getStream().length - startEvents;

    return {
      ...merged,
      emittedEvents,
      memoryDeltaBytes,
      memoryGuardPassed: Number.isFinite(memoryDeltaBytes) && memoryDeltaBytes < 200 * 1024 * 1024
    };
  }

  public async activateContinuousMode(cycles = 1): Promise<ContinuousCycleResult> {
    let alertsEvaluated = 0;
    const beforeEvents = this.runtime.eventBus.getStream().length;

    for (let index = 0; index < cycles; index += 1) {
      this.hardening.runDiagnostics();

      await this.runtime.generators.microSaaS.generate(`auto_product_${index}`, {
        plan: 'starter',
        features: ['event-driven', 'autonomous-runner'],
        limits: {
          monthlyRequests: 1000
        }
      });

      await this.runtime.eventBus.publish(
        createEventEnvelope('product.released', 'AutonomousSystemController', {
          productId: `auto_product_${index}`,
          version: '1.0.0'
        })
      );

      await this.container.captureLeadHandler.execute({
        leadId: `auto_lead_${index}`,
        source: 'autonomous:web'
      });

      await this.runtime.pricingResolver.resolve(`auto_customer_${index}`, 'starter');
      await this.runtime.funnelOrchestrator.run('facturautentico-cloud', 'web');
      await this.runtime.pipelineActivator.activate(`auto_customer_${index}`, 'weekly-summary', 'starter');

      const bot = this.runtime.botProvisioner.provision(`auto_customer_${index}`, 'starter');
      this.runtime.botUsageTracker.track(bot.customerId, 'web', 1);
      this.runtime.botQuotaEnforcer.canUse(bot.customerId, 'web', bot.plan);

      this.hardening.metricsRegistry.increment('autonomous.cycle.completed');
      alertsEvaluated += this.hardening.alerts.evaluator.run().length;
    }

    return {
      cycles,
      emittedEvents: this.runtime.eventBus.getStream().length - beforeEvents,
      alertsEvaluated
    };
  }
}