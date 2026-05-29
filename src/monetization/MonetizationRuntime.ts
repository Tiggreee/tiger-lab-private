import { PipelineActivator } from '../automation/PipelineActivator';
import { PipelineBillingAdapter } from '../automation/PipelineBillingAdapter';
import { PipelineCatalog } from '../automation/PipelineCatalog';
import { BotProvisioner } from '../bots-as-a-service/BotProvisioner';
import { BotQuotaEnforcer } from '../bots-as-a-service/BotQuotaEnforcer';
import { BotUsageTracker } from '../bots-as-a-service/BotUsageTracker';
import { AutoContentGenerator } from '../content/engine/AutoContentGenerator';
import { AutoPublisher } from '../content/engine/AutoPublisher';
import { ReleaseEventListener } from '../content/engine/ReleaseEventListener';
import { CatalogFileRepository } from '../catalog/infrastructure/CatalogFileRepository';
import { FunnelAlerting } from '../funnel/FunnelAlerting';
import { FunnelKpiTracker } from '../funnel/FunnelKpiTracker';
import { FunnelOrchestrator } from '../funnel/FunnelOrchestrator';
import { LeadCaptureOrchestrator } from '../lead/engine/LeadCaptureOrchestrator';
import { LeadNurturingSequencer } from '../lead/engine/LeadNurturingSequencer';
import { LeadScoreRefresher } from '../lead/engine/LeadScoreRefresher';
import { createEventEnvelope } from './core/EventEnvelope';
import { InMemoryEventBus } from './core/InMemoryEventBus';
import { DecideCommercialActionUseCase } from '../orchestration/application/use-cases/DecideCommercialActionUseCase';
import { PricingExperimentManager } from '../pricing/PricingExperimentManager';
import { PricingResolver } from '../pricing/PricingResolver';
import { PricingRuleEngine } from '../pricing/PricingRuleEngine';
import { ApiTemplateGenerator } from '../product/generators/ApiTemplateGenerator';
import { MicroSaaSGenerator } from '../product/generators/MicroSaaSGenerator';
import { ScriptPremiumGenerator } from '../product/generators/ScriptPremiumGenerator';
import { CommercialMetadata } from '../product/generators/types';

export interface MonetizationRuntime {
  readonly eventBus: InMemoryEventBus;
  readonly generators: {
    readonly microSaaS: MicroSaaSGenerator;
    readonly apiTemplate: ApiTemplateGenerator;
    readonly scriptPremium: ScriptPremiumGenerator;
  };
  readonly pricingResolver: PricingResolver;
  readonly botProvisioner: BotProvisioner;
  readonly botUsageTracker: BotUsageTracker;
  readonly botQuotaEnforcer: BotQuotaEnforcer;
  readonly funnelOrchestrator: FunnelOrchestrator;
  readonly pipelineActivator: PipelineActivator;
}

export function createMonetizationRuntime(): MonetizationRuntime {
  const eventBus = new InMemoryEventBus();
  const catalogRepository = new CatalogFileRepository();

  const microSaaS = new MicroSaaSGenerator(eventBus);
  const apiTemplate = new ApiTemplateGenerator(eventBus);
  const scriptPremium = new ScriptPremiumGenerator(eventBus);

  const autoContentGenerator = new AutoContentGenerator(eventBus);
  const autoPublisher = new AutoPublisher(eventBus);
  const releaseListener = new ReleaseEventListener(eventBus, autoContentGenerator, autoPublisher);
  releaseListener.wire();

  const leadCapture = new LeadCaptureOrchestrator(eventBus);
  const leadRefresher = new LeadScoreRefresher(eventBus);
  const nurturingSequencer = new LeadNurturingSequencer(eventBus);
  const commercialDecision = new DecideCommercialActionUseCase();

  const kpiTracker = new FunnelKpiTracker();
  const alerting = new FunnelAlerting(eventBus, kpiTracker);
  const funnelOrchestrator = new FunnelOrchestrator(
    eventBus,
    leadCapture,
    leadRefresher,
    nurturingSequencer,
    commercialDecision,
    catalogRepository,
    kpiTracker,
    alerting
  );

  const pricingRuleEngine = new PricingRuleEngine(catalogRepository);
  const experimentManager = new PricingExperimentManager();
  const pricingResolver = new PricingResolver(eventBus, pricingRuleEngine, experimentManager);

  const botUsageTracker = new BotUsageTracker();
  const botProvisioner = new BotProvisioner();
  const botQuotaEnforcer = new BotQuotaEnforcer(botUsageTracker);

  const pipelineCatalog = new PipelineCatalog();
  const pipelineBillingAdapter = new PipelineBillingAdapter();
  const pipelineActivator = new PipelineActivator(eventBus, pipelineCatalog, pipelineBillingAdapter);

  return {
    eventBus,
    generators: {
      microSaaS,
      apiTemplate,
      scriptPremium
    },
    pricingResolver,
    botProvisioner,
    botUsageTracker,
    botQuotaEnforcer,
    funnelOrchestrator,
    pipelineActivator
  };
}

export async function runMonetizationBootstrapScenario(): Promise<void> {
  const runtime = createMonetizationRuntime();

  const metadata: CommercialMetadata = {
    plan: 'pro',
    features: ['api-access', 'priority-support'],
    limits: {
      monthlyRequests: 100000
    }
  };

  await runtime.generators.microSaaS.generate('facturautentico-cloud', metadata);
  await runtime.eventBus.publish(
    createEventEnvelope('product.released', 'MonetizationRuntime', {
      productId: 'facturautentico-cloud',
      version: '1.0.0'
    })
  );

  await runtime.funnelOrchestrator.run('facturautentico-cloud', 'web');
  await runtime.pricingResolver.resolve('customer_01', 'pro');
  await runtime.pipelineActivator.activate('customer_01', 'weekly-summary', 'pro');
}
