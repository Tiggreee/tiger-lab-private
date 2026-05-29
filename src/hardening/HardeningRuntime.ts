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
import { createEventEnvelope } from '../monetization/core/EventEnvelope';
import { InMemoryEventBus } from '../monetization/core/InMemoryEventBus';
import { AlertChannel } from '../observability/alerts/AlertChannel';
import { AlertEvaluator } from '../observability/alerts/AlertEvaluator';
import { AlertRuleEngine } from '../observability/alerts/AlertRuleEngine';
import { DashboardRenderer } from '../observability/dashboard/DashboardRenderer';
import { JsonDashboardExporter } from '../observability/dashboard/exporters/JsonDashboardExporter';
import { BotUsageMetrics } from '../observability/metrics/BotUsageMetrics';
import { FunnelMetrics } from '../observability/metrics/FunnelMetrics';
import { MetricsRegistry } from '../observability/metrics/MetricsRegistry';
import { ObservedBotUsageTracker } from '../observability/metrics/ObservedBotUsageTracker';
import { ObservedFunnelOrchestrator } from '../observability/metrics/ObservedFunnelOrchestrator';
import { ObservedLeadNurturingSequencer } from '../observability/metrics/ObservedLeadNurturingSequencer';
import { ObservedPricingResolver } from '../observability/metrics/ObservedPricingResolver';
import { PricingMetrics } from '../observability/metrics/PricingMetrics';
import { DecideCommercialActionUseCase } from '../orchestration/application/use-cases/DecideCommercialActionUseCase';
import { PricingExperimentManager } from '../pricing/PricingExperimentManager';
import { PricingResolver } from '../pricing/PricingResolver';
import { PricingRuleEngine } from '../pricing/PricingRuleEngine';
import { ApiTemplateGenerator } from '../product/generators/ApiTemplateGenerator';
import { MicroSaaSGenerator } from '../product/generators/MicroSaaSGenerator';
import { ScriptPremiumGenerator } from '../product/generators/ScriptPremiumGenerator';
import { FunnelLoadTester } from '../simulators/FunnelLoadTester';
import { PricingStressTester } from '../simulators/PricingStressTester';
import { TrafficSimulator } from '../simulators/TrafficSimulator';

export interface HardeningRuntime {
  readonly metricsRegistry: MetricsRegistry;
  readonly alerts: {
    readonly channel: AlertChannel;
    readonly evaluator: AlertEvaluator;
  };
  readonly simulators: {
    readonly traffic: TrafficSimulator;
    readonly funnel: FunnelLoadTester;
    readonly pricing: PricingStressTester;
  };
  readonly observed: {
    readonly funnel: ObservedFunnelOrchestrator;
    readonly pricing: ObservedPricingResolver;
    readonly botUsage: ObservedBotUsageTracker;
    readonly leadNurturing: ObservedLeadNurturingSequencer;
  };
  runDiagnostics(): Record<string, unknown>;
}

export function createHardeningRuntime(): HardeningRuntime {
  const eventBus = new InMemoryEventBus();
  const catalogRepository = new CatalogFileRepository();

  const autoContentGenerator = new AutoContentGenerator(eventBus);
  const autoPublisher = new AutoPublisher(eventBus);
  const releaseListener = new ReleaseEventListener(eventBus, autoContentGenerator, autoPublisher);
  releaseListener.wire();

  const leadCapture = new LeadCaptureOrchestrator(eventBus);
  const leadRefresher = new LeadScoreRefresher(eventBus);
  const leadNurturing = new LeadNurturingSequencer(eventBus);
  const commercialDecision = new DecideCommercialActionUseCase();
  const kpiTracker = new FunnelKpiTracker();
  const funnelAlerting = new FunnelAlerting(eventBus, kpiTracker);

  const baseFunnel = new FunnelOrchestrator(
    eventBus,
    leadCapture,
    leadRefresher,
    leadNurturing,
    commercialDecision,
    catalogRepository,
    kpiTracker,
    funnelAlerting
  );

  const pricingRuleEngine = new PricingRuleEngine(catalogRepository);
  const pricingExperimentManager = new PricingExperimentManager();
  const basePricingResolver = new PricingResolver(eventBus, pricingRuleEngine, pricingExperimentManager);

  const baseBotUsage = new BotUsageTracker();
  const botProvisioner = new BotProvisioner();
  void botProvisioner;
  const botQuotaEnforcer = new BotQuotaEnforcer(baseBotUsage);
  void botQuotaEnforcer;

  const pipelineCatalog = new PipelineCatalog();
  const pipelineBillingAdapter = new PipelineBillingAdapter();
  const pipelineActivator = new PipelineActivator(eventBus, pipelineCatalog, pipelineBillingAdapter);
  void pipelineActivator;

  const microSaaSGenerator = new MicroSaaSGenerator(eventBus);
  const apiTemplateGenerator = new ApiTemplateGenerator(eventBus);
  const scriptPremiumGenerator = new ScriptPremiumGenerator(eventBus);
  void microSaaSGenerator;
  void apiTemplateGenerator;
  void scriptPremiumGenerator;

  const metricsRegistry = new MetricsRegistry();
  const funnelMetrics = new FunnelMetrics(metricsRegistry);
  const pricingMetrics = new PricingMetrics(metricsRegistry);
  const botUsageMetrics = new BotUsageMetrics(metricsRegistry);

  const observedLeadNurturing = new ObservedLeadNurturingSequencer(leadNurturing, metricsRegistry);
  void observedLeadNurturing;

  const observedFunnel = new ObservedFunnelOrchestrator(baseFunnel, funnelMetrics);
  const observedPricing = new ObservedPricingResolver(basePricingResolver, pricingMetrics);
  const observedBotUsage = new ObservedBotUsageTracker(baseBotUsage, botUsageMetrics);

  eventBus.subscribe('lead.created', (event) => {
    const source = String(event.payload.source || 'unknown:unknown');
    const channel = source.split(':')[0] || 'unknown';
    metricsRegistry.increment(`lead.created.${channel}.count`);
  });

  eventBus.subscribe('lead.nurtured', (event) => {
    const sequence = String(event.payload.sequence || 'unknown');
    metricsRegistry.increment('lead.nurturing.sequence.count', 1, { sequence });
  });

  const alertRuleEngine = new AlertRuleEngine(metricsRegistry);
  const alertChannel = new AlertChannel();
  const alertEvaluator = new AlertEvaluator(alertRuleEngine, alertChannel);

  const trafficSimulator = new TrafficSimulator(eventBus, leadCapture);
  const funnelLoadTester = new FunnelLoadTester(eventBus, baseFunnel);
  const pricingStressTester = new PricingStressTester(eventBus, basePricingResolver);

  const dashboardRenderer = new DashboardRenderer(metricsRegistry);
  const dashboardExporter = new JsonDashboardExporter(
    dashboardRenderer,
    funnelMetrics,
    pricingMetrics,
    botUsageMetrics,
    eventBus
  );

  function runDiagnostics(): Record<string, unknown> {
    const alerts = alertEvaluator.run();

    return {
      generatedAt: new Date().toISOString(),
      alerts,
      metrics: metricsRegistry.toJSON(),
      dashboard: dashboardExporter.export(),
      eventStreamSize: eventBus.getStream().length
    };
  }

  return {
    metricsRegistry,
    alerts: {
      channel: alertChannel,
      evaluator: alertEvaluator
    },
    simulators: {
      traffic: trafficSimulator,
      funnel: funnelLoadTester,
      pricing: pricingStressTester
    },
    observed: {
      funnel: observedFunnel,
      pricing: observedPricing,
      botUsage: observedBotUsage,
      leadNurturing: observedLeadNurturing
    },
    runDiagnostics
  };
}

export async function runHardeningDiagnosticsScenario(): Promise<Record<string, unknown>> {
  const runtime = createHardeningRuntime();

  await runtime.simulators.traffic.simulate('web', 12);
  await runtime.simulators.funnel.run('facturautentico-cloud', 'web', 3);
  await runtime.observed.pricing.resolve('diag_customer_1', 'pro');
  runtime.observed.botUsage.track('diag_customer_1', 'web', 12001);

  return runtime.runDiagnostics();
}
