#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const CATALOG_PATH = path.resolve('ops/catalog/products.json');
const BENCHMARKS_PATH = path.resolve('ops/catalog/benchmarks.json');
const SCORES_PATH = path.resolve('ops/runtime/product-scores.json');
const ROADMAPS_PATH = path.resolve('ops/runtime/product-roadmaps.json');
const HISTORY_PATH = path.resolve('ops/runtime/product-score-history.json');
const DASHBOARD_PATH = path.resolve('ops/runtime/dashboard-unified.json');
const VIABILITY_PATH = path.resolve('ops/runtime/product-viability-agent-report.json');
const MODULE_ALERTS_PATH = path.resolve('ops/runtime/module-bypass-alerts.json');
const WAVE_PLAN_PATH = path.resolve('ops/runtime/product-wave-plan.json');

const ORCHESTRATION_MODULES = [
  { id: 'design', command: 'node scripts/product-architect.mjs', stage: 'design', optional: true },
  { id: 'development', command: 'node scripts/generate-product.mjs --dryRun', stage: 'development', optional: true },
  { id: 'market-foundation', command: 'node scripts/analyze-monetization.mjs', stage: 'foundation', optional: true },
  { id: 'security-foundation', command: 'node scripts/verify-systems.mjs', stage: 'foundation', optional: true },
];

const PROTECTED_KEYWORDS = ['billing', 'checkout', 'auth', 'prod:gate', 'production-go-no-go'];

const DIMENSIONS = [
  { id: 'market_fit', label: 'Market Fit', weight: 0.20 },
  { id: 'technical_quality', label: 'Technical Quality', weight: 0.15 },
  { id: 'monetization_readiness', label: 'Monetization Readiness', weight: 0.15 },
  { id: 'completion_level', label: 'Completion Level', weight: 0.15 },
  { id: 'competitiveness', label: 'Competitiveness vs Benchmarks', weight: 0.15 },
  { id: 'automation_coverage', label: 'Automation Coverage', weight: 0.10 },
  { id: 'documentation', label: 'Documentation & Onboarding', weight: 0.05 },
  { id: 'integration_depth', label: 'Integration Depth', weight: 0.05 },
];

const BENCHMARKS_FALLBACK = {
  "facturautentico-cloud": {
    "category": "CFDI / Facturación Electrónica MX",
    "comparableProducts": [
      { name: "Facturapi", url: "https://facturapi.io", strengths: ["API-first CFDI", "Multi-PAC", "Webhooks"], price: "Desde $299/mes", rating: 92 },
      { name: "Facturación.com", url: "https://facturacion.com", strengths: ["SAT certified", "30K+ clients", "PAC Finkok native"], price: "Desde $399/mes", rating: 90 },
      { name: "Contpaq Facturación", url: "https://www.contpaq.com", strengths: ["Contabilidad integrada", "On-premise + cloud", "Nómina"], price: "Desde $199/mes", rating: 88 },
      { name: "Aspel FACTU", url: "https://www.aspel.com.mx", strengths: ["Mercado MX establecido", "Multi-empresa", "Inventarios"], price: "Desde $249/mes", rating: 86 },
    ]
  },
  "docflow-api": {
    "category": "API de Flujos Documentales / Workflow Automation",
    "comparableProducts": [
      { name: "Documenso", url: "https://documenso.com", strengths: ["Open source", "API-first", "Self-hostable"], price: "Gratis (self-host) / $15/mes cloud", rating: 91 },
      { name: "Docuseal", url: "https://www.docuseal.co", strengths: ["Open source", "Plantillas", "Firma electrónica"], price: "Gratis (self-host) / $20/mes cloud", rating: 89 },
      { name: "Zapier Interfaces", url: "https://zapier.com", strengths: ["5000+ integraciones", "No-code", "IA"], price: "Desde $30/mes", rating: 95 },
      { name: "Nintex", url: "https://www.nintex.com", strengths: ["Enterprise", "Workflow automation", "Doc generation"], price: "Desde $100/mes", rating: 88 },
    ]
  },
  "sentrylog-lite": {
    "category": "Logging / Observabilidad Ligero",
    "comparableProducts": [
      { name: "Better Stack", url: "https://betterstack.com", strengths: ["Logs + uptime", "Equipo pequeño friendly", "Gratis 1GB/mes"], price: "Gratis / $29/mes", rating: 90 },
      { name: "SigNoz", url: "https://signoz.io", strengths: ["Open source", "OpenTelemetry", "Traces + metrics"], price: "Gratis (self-host)", rating: 93 },
      { name: "Axiom", url: "https://axiom.co", strengths: ["Sin índices", "Rápido", "5TB gratis"], price: "Gratis / $49/mes", rating: 88 },
      { name: "Logtail", url: "https://logtail.com", strengths: ["ClickHouse-based", "SQL queries", "Equipos pequeños"], price: "Gratis / $19/mes", rating: 86 },
    ]
  },
  "script-premium-kit": {
    "category": "Automatización / Scripts Premium para PyMEs",
    "comparableProducts": [
      { name: "Make (Integromat)", url: "https://www.make.com", strengths: ["Visual builder", "2000+ apps", "Escenarios complejos"], price: "Desde $9/mes", rating: 94 },
      { name: "n8n", url: "https://n8n.io", strengths: ["Open source", "Self-host", "IA nodes"], price: "Gratis (self-host)", rating: 93 },
      { name: "Actiondesk", url: "https://www.actiondesk.io", strengths: ["Spreadsheet-native", "Operaciones", "No-code"], price: "Desde $39/mes", rating: 85 },
      { name: "Pipedream", url: "https://pipedream.com", strengths: ["Developer-first", "1000+ integraciones", "Gratis 10k eventos/mes"], price: "Gratis / $19/mes", rating: 91 },
    ]
  },
  "facturautentico": {
    "category": "Motor CFDI / PAC Management",
    "comparableProducts": [
      { name: "Facturapi", url: "https://facturapi.io", strengths: ["API-first", "Multi-PAC", "Complementos"], price: "Desde $299/mes", rating: 92 },
      { name: "División Facturación", url: "https://divisionfacturacion.com", strengths: ["CFDI 4.0", "PAC agnóstico", "Batch"], price: "Desde $199/mes", rating: 88 },
      { name: "Factura Rapid", url: "https://www.facturarapid.com", strengths: ["Simplicidad", "CFDI + nómina", "Soporte MX"], price: "Desde $149/mes", rating: 85 },
      { name: "SumUp Facturas", url: "https://sumup.com", strengths: ["Pagos + facturas", "App móvil", "Sin mensualidad"], price: "Gratis + comisión", rating: 82 },
    ]
  }
};

// Single source of truth: ops/catalog/benchmarks.json. Falls back to the inline
// dataset above if the file is missing or unreadable, so scoring never breaks.
function loadBenchmarks() {
  try {
    if (fs.existsSync(BENCHMARKS_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(BENCHMARKS_PATH, 'utf8'));
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch {
    // fall through to inline fallback
  }
  return BENCHMARKS_FALLBACK;
}

const BENCHMARKS = loadBenchmarks();

const PRODUCT_PLAYBOOKS = {
  'docflow-api': {
    blocked: [
      'Ship a template library for the 3 highest-value document workflows',
      'Publish a quickstart showing API auth, webhook delivery, and audit trail',
      'Add a demo pack with a real end-to-end flow, not a dummy stub'
    ],
    foundation: [
      'Close the integration depth gap with webhooks, email delivery, and signed event examples',
      'Publish 3 walkthroughs: intake, approval, and export/history',
      'Package a comparison page against Documenso and Docuseal with a clear why-us section'
    ]
  },
  'script-premium-kit': {
    blocked: [
      'Bundle the top scripts into 3 outcome-based packs with install instructions',
      'Publish a CLI/README flow that takes a user from zero to first automation in 10 minutes',
      'Add a changelog and upgrade path so the pack feels maintained, not random'
    ],
    foundation: [
      'Package 10 turnkey scripts by business outcome instead of by technology',
      'Ship examples for SMB ops, sales follow-up, and recurring admin work',
      'Create a buyer-facing comparison page versus Make, n8n, and Pipedream'
    ]
  },
  'facturautentico-cloud': {
    blocked: [
      'Contract the PAC and validate the CFDI timbrado path end to end',
      'Add a SAT-compliant sample XML and a failure catalog for common timbrado errors',
      'Publish rollback, audit, and invoice reconciliation steps before relaunch'
    ],
    foundation: [
      'Do not expand scope until PAC is live and the first invoice cycle is proven',
      'Document the exact operational path from payment to CFDI issuance',
      'Create a recovery playbook for PAC failures and retries'
    ]
  },
  facturautentico: {
    blocked: [
      'Contract the PAC and prove the shared timbrado flow before any UI work',
      'Align the on-premise flow with the cloud product on CFDI validation and audit trail',
      'Write the operator checklist for invoice issuance and recovery'
    ],
    foundation: [
      'Keep scope locked to the PAC unblocker until invoice issuance is real',
      'Reuse the same CFDI validation and reconciliation discipline as the cloud product',
      'Avoid new features until the release path is demonstrably closed-loop'
    ]
  },
  'sentrylog-lite': {
    blocked: [
      'Validate whether this should ship standalone or as a bundle with Docflow API',
      'Build the minimal ingest, search, and alert sample before adding polish',
      'Run a demand test with a concrete logging buyer persona before committing more build time'
    ],
    foundation: [
      'Position the product around SMB-friendly observability and fast setup',
      'Prepare one integration path and one alert path, not a broad platform',
      'Decide bundle pricing with the existing active products'
    ]
  }
};

function loadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

function loadViabilityReport() {
  return loadJSON(VIABILITY_PATH) || { products: [], summary: {} };
}

function getViabilityEntry(viabilityReport, productId) {
  return (viabilityReport?.products || []).find((entry) => entry.productId === productId) || null;
}

function getBenchmarkCompetitorNames(benchmarkData) {
  return (benchmarkData?.comparableProducts || [])
    .slice(0, 2)
    .map((competitor) => competitor.name)
    .filter(Boolean);
}

function buildProductLens(product, benchmarkData, viabilityEntry) {
  const playbook = PRODUCT_PLAYBOOKS[product.id] || { blocked: [], foundation: [] };
  const blockers = Array.isArray(viabilityEntry?.viability?.blockers) ? viabilityEntry.viability.blockers : [];
  const competitors = getBenchmarkCompetitorNames(benchmarkData);
  const competitorLabel = competitors.length > 0 ? competitors.join(' y ') : 'competidores directos';

  return {
    blockers,
    playbook,
    competitors,
    competitorLabel,
    localAiNeed: playbook.localAiNeed || 'Baja. No se necesita un LLM local para este producto.'
  };
}

function isProtectedModule(moduleDef) {
  const haystack = `${moduleDef.id} ${moduleDef.command}`.toLowerCase();
  return PROTECTED_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function runOrchestrationModules({ failOpen = true, skipExecution = false } = {}) {
  const startedAt = new Date().toISOString();
  const alerts = [];
  const modules = [];

  for (const moduleDef of ORCHESTRATION_MODULES) {
    if (isProtectedModule(moduleDef)) {
      alerts.push({
        type: 'module_blocked_by_policy',
        moduleId: moduleDef.id,
        severity: 'critical',
        message: `Blocked protected module '${moduleDef.id}' from fail-open orchestration.`
      });
      modules.push({
        ...moduleDef,
        status: 'blocked',
        bypassed: false,
        reason: 'protected-by-runtime-hardening'
      });
      continue;
    }

    if (skipExecution) {
      modules.push({ ...moduleDef, status: 'skipped', bypassed: false, reason: 'summary-only-mode' });
      continue;
    }

    try {
      execSync(moduleDef.command, {
        cwd: process.cwd(),
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 120000,
      });
      modules.push({ ...moduleDef, status: 'ok', bypassed: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown module execution error';
      const bypassed = failOpen && moduleDef.optional;
      modules.push({
        ...moduleDef,
        status: bypassed ? 'bypassed' : 'failed',
        bypassed,
        reason: message.slice(0, 300)
      });
      alerts.push({
        type: bypassed ? 'module_bypassed' : 'module_failed',
        moduleId: moduleDef.id,
        severity: bypassed ? 'warn' : 'critical',
        message: bypassed
          ? `Module '${moduleDef.id}' failed and was bypassed to keep flow active.`
          : `Module '${moduleDef.id}' failed and stopped orchestration.`,
      });

      if (!bypassed) {
        fs.writeFileSync(MODULE_ALERTS_PATH, JSON.stringify({
          generatedAt: new Date().toISOString(),
          startedAt,
          failOpen,
          flowStatus: 'stopped',
          alerts,
          modules,
        }, null, 2));
        throw error;
      }
    }
  }

  const flowStatus = modules.some((m) => m.status === 'failed') ? 'degraded' : 'active';
  const report = {
    generatedAt: new Date().toISOString(),
    startedAt,
    failOpen,
    flowStatus,
    alerts,
    modules,
    summary: {
      total: modules.length,
      ok: modules.filter((m) => m.status === 'ok').length,
      bypassed: modules.filter((m) => m.status === 'bypassed').length,
      blocked: modules.filter((m) => m.status === 'blocked').length,
      failed: modules.filter((m) => m.status === 'failed').length,
      skipped: modules.filter((m) => m.status === 'skipped').length,
    }
  };

  fs.writeFileSync(MODULE_ALERTS_PATH, JSON.stringify(report, null, 2));
  return report;
}

function toHybridId(a, b, index) {
  const slugA = a.product.id.replace(/[^a-z0-9-]/gi, '-');
  const slugB = b.product.id.replace(/[^a-z0-9-]/gi, '-');
  return `hybrid-${slugA}-${slugB}-${index + 1}`.toLowerCase();
}

function buildWavePlan(allResults) {
  const maxProducts = 21;
  const completed = allResults.filter((r) => r.score >= 90);
  const fallbackPool = allResults.filter((r) => r.score < 90);
  const queue = [...completed, ...fallbackPool];

  const waves = [];
  let pointer = 0;
  let totalPlanned = 0;

  while (pointer < queue.length && totalPlanned < maxProducts) {
    const waveIndex = waves.length;
    const baseSlots = Math.min(5, maxProducts - totalPlanned);
    const baseProducts = queue.slice(pointer, pointer + baseSlots);
    pointer += baseProducts.length;
    totalPlanned += baseProducts.length;

    const hybrids = [];
    if (baseProducts.length >= 2) {
      const pairA = [baseProducts[0], baseProducts[1]];
      hybrids.push({
        id: toHybridId(pairA[0], pairA[1], 0),
        name: `${pairA[0].product.name} x ${pairA[1].product.name}`,
        sourceProducts: [pairA[0].product.id, pairA[1].product.id],
        type: 'hybrid',
        stage: 'concept'
      });
    }
    if (baseProducts.length >= 4 && totalPlanned + hybrids.length < maxProducts) {
      const pairB = [baseProducts[2], baseProducts[3]];
      hybrids.push({
        id: toHybridId(pairB[0], pairB[1], 1),
        name: `${pairB[0].product.name} x ${pairB[1].product.name}`,
        sourceProducts: [pairB[0].product.id, pairB[1].product.id],
        type: 'hybrid',
        stage: 'concept'
      });
    }

    const trimmedHybrids = hybrids.slice(0, Math.max(0, Math.min(2, maxProducts - totalPlanned)));
    totalPlanned += trimmedHybrids.length;

    waves.push({
      wave: waveIndex + 1,
      products: baseProducts.map((r) => ({
        id: r.product.id,
        name: r.product.name,
        score: r.score,
        status: r.product.status,
        completion: r.score >= 90 ? 'finished' : 'working'
      })),
      hybrids: trimmedHybrids,
      totals: {
        products: baseProducts.length,
        hybrids: trimmedHybrids.length,
        waveTotal: baseProducts.length + trimmedHybrids.length,
      }
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    policy: {
      productsPerWave: 5,
      hybridsPerWave: 2,
      maxProducts: 21
    },
    totals: {
      waves: waves.length,
      plannedProducts: waves.reduce((acc, w) => acc + w.totals.products, 0),
      plannedHybrids: waves.reduce((acc, w) => acc + w.totals.hybrids, 0),
      plannedOverall: waves.reduce((acc, w) => acc + w.totals.waveTotal, 0),
      completedInputProducts: completed.length,
    },
    waves,
  };
}

function classifyScore(score) {
  if (score >= 95) return { tier: 'P5', label: 'Production Ready — Engine Grade', color: '🟢' };
  if (score >= 90) return { tier: 'P4', label: 'Near Production — Minor refinements', color: '🔵' };
  if (score >= 75) return { tier: 'P3', label: 'Solid Foundation — Gaps remain', color: '🟡' };
  if (score >= 60) return { tier: 'P2', label: 'Early Stage — Needs work', color: '🟠' };
  return { tier: 'P1', label: 'Concept — Requires rebuild', color: '🔴' };
}

function scoreProduct(product, benchmarks) {
  const bmData = benchmarks[product.id];
  const competitorRatings = bmData?.comparableProducts?.map(c => c.rating) || [80];
  const avgCompetitor = competitorRatings.reduce((a, b) => a + b, 0) / competitorRatings.length;
  const maxCompetitor = Math.max(...competitorRatings);

  const scores = {};
  let weightedTotal = 0;

  for (const dim of DIMENSIONS) {
    let base = 50;

    if (dim.id === 'market_fit') {
      base = product.status === 'active' ? 85 : product.status === 'paused' ? 65 : 40;
      if (bmData) base += 5;
    }
    if (dim.id === 'technical_quality') {
      if (product.id === 'docflow-api') base = 88;
      else if (product.id === 'script-premium-kit') base = 85;
      else if (product.status === 'planned') base = 35;
      else base = 60;
    }
    if (dim.id === 'monetization_readiness') {
      if (product.status === 'active') base = 80;
      else if (product.status === 'paused') base = 60;
      else base = 30;
    }
    if (dim.id === 'completion_level') {
      if (product.id === 'docflow-api') base = 85;
      else if (product.id === 'script-premium-kit') base = 82;
      else if (product.status === 'planned') base = 20;
      else base = 55;
    }
    if (dim.id === 'competitiveness') {
      base = Math.min(95, (product.status === 'active' ? 80 : 50) * (avgCompetitor / 85));
    }
    if (dim.id === 'automation_coverage') {
      base = product.id === 'docflow-api' ? 80 : product.id === 'script-premium-kit' ? 85 : 45;
    }
    if (dim.id === 'documentation') {
      const docExists = ['docflow-api', 'script-premium-kit'].includes(product.id);
      base = docExists ? 75 : 40;
    }
    if (dim.id === 'integration_depth') {
      base = product.status === 'active' ? 70 : 35;
    }

    base = Math.min(100, Math.max(5, base));
    scores[dim.id] = { score: Math.round(base), weight: dim.weight, label: dim.label };
    weightedTotal += base * dim.weight;
  }

  const finalScore = Math.round(Math.min(100, weightedTotal));

  const gaps = [];
  for (const dim of DIMENSIONS) {
    if (scores[dim.id].score < 80) gaps.push({ dimension: dim.label, score: scores[dim.id].score, gap: 80 - scores[dim.id].score });
  }
  gaps.sort((a, b) => b.gap - a.gap);

  return { finalScore, classification: classifyScore(finalScore), scores, gaps, avgCompetitor, maxCompetitor };
}

function generateRoadmap(product, score, benchmarks, viabilityEntry) {
  const bmData = benchmarks[product.id];
  const lens = buildProductLens(product, bmData, viabilityEntry);
  const steps = [];

  const isBlocked = product.status === 'paused' || String(viabilityEntry?.viability?.status || '').toUpperCase() === 'BLOCKED' || lens.blockers.length > 0;
  const blockerLabel = lens.blockers[0] || 'resolver la dependencia externa principal';

  if (score.finalScore >= 95) {
    steps.push({
      priority: 'P0',
      action: `Mantener '${product.name}' y monitorear ${lens.competitorLabel} sin cambiar el core que ya funciona`,
      effort: 'bajo',
      owner: 'ai'
    });
    return {
      currentScore: score.finalScore,
      targetScore: 95,
      steps,
      status: 'PRODUCTION_READY',
      focus: 'defend',
      localAiNeed: lens.localAiNeed
    };
  }

  if (isBlocked) {
    steps.push({
      priority: 'P0',
      action: `Resolver bloqueo real de '${product.name}': ${blockerLabel}`,
      effort: 'medio',
      owner: 'human',
      blocker: true
    });
    for (const action of lens.playbook.blocked.slice(0, 2)) {
      steps.push({
        priority: 'P0',
        action,
        effort: 'medio',
        owner: 'human'
      });
    }
  }

  for (const gap of score.gaps) {
    if (gap.gap <= 0) continue;
    let action = '';
    let effort = 'medio';

    if (gap.dimension === 'Market Fit') {
      action = `Validar propuesta de '${product.name}' con 5 prospectos del segmento objetivo y cerrar el caso de uso más urgente`;
      effort = 'medio';
    } else if (gap.dimension === 'Technical Quality') {
      action = `Hardening técnico de '${product.name}': tests, types, error handling y performance en el flujo principal`;
      effort = 'alto';
    } else if (gap.dimension === 'Monetization Readiness') {
      action = `Cerrar monetización de '${product.name}': pricing, checkout y evidencia de cobro real`;
      effort = 'medio';
    } else if (gap.dimension === 'Completion Level') {
      action = `Completar el core de '${product.name}': priorizar las 3 capacidades que el buyer realmente compra`;
      effort = 'alto';
    } else if (gap.dimension === 'Competitiveness vs Benchmarks') {
      action = `Diferenciar '${product.name}' contra ${lens.competitorLabel}: cerrar la brecha que el benchmark muestra`;
      effort = 'alto';
    } else if (gap.dimension === 'Automation Coverage') {
      action = `Automatizar CI/CD, pruebas y despliegue de '${product.name}' para reducir trabajo manual`;
      effort = 'medio';
    } else if (gap.dimension === 'Documentation & Onboarding') {
      action = `Publicar README, quickstart y onboarding de '${product.name}' con un flujo real de arranque`;
      effort = 'bajo';
    } else if (gap.dimension === 'Integration Depth') {
      action = `Profundizar integraciones de '${product.name}' según su caso de uso: no sumar conectores genéricos sin demanda`;
      effort = 'medio';
    }

    steps.push({
      priority: gap.gap > 20 ? 'P0' : gap.gap > 10 ? 'P1' : 'P2',
      action,
      effort,
      owner: gap.gap > 15 ? 'human' : 'ai',
      gap: gap.gap
    });
  }

  const productPlaybookSteps = isBlocked ? lens.playbook.blocked : lens.playbook.foundation;
  for (const action of productPlaybookSteps) {
    if (steps.some((step) => step.action === action)) continue;
    steps.push({
      priority: isBlocked ? 'P0' : 'P1',
      action,
      effort: 'medio',
      owner: isBlocked ? 'human' : 'ai'
    });
  }

  // Ensure we have at least 3 concrete steps, never abstract filler.
  if (steps.length < 3) {
    steps.push({ priority: 'P2', action: `Concretar un caso de uso real para '${product.name}' y escribir el flujo de punta a punta`, effort: 'bajo', owner: 'ai', gap: 0 });
    steps.push({ priority: 'P2', action: `Actualizar documentación y ejemplos de '${product.name}' con evidencia operacional real`, effort: 'bajo', owner: 'ai', gap: 0 });
  }

  const estimatedHours = steps.reduce((sum, s) => sum + (s.effort === 'alto' ? 8 : s.effort === 'medio' ? 4 : 2), 0);
  const target95Steps = steps.filter(s => s.gap > 0).slice(0, 5);
  const target90Steps = steps.filter(s => s.gap > 0).slice(0, 3);

  return {
    currentScore: score.finalScore,
    targetScore95: Math.min(95, score.finalScore + target95Steps.reduce((sum, s) => sum + Math.round(Math.min(8, s.gap || 5) * 0.6), 0)),
    targetScore90: Math.min(90, score.finalScore + target90Steps.reduce((sum, s) => sum + Math.round(Math.min(8, s.gap || 5) * 0.5), 0)),
    steps,
    estimatedHours,
    estimatedSprints: Math.ceil(estimatedHours / 8),
    status: isBlocked ? 'BLOCKED_BY_EXTERNAL_DEPENDENCY' : score.finalScore >= 90 ? 'CLOSE_TO_TARGET' : score.finalScore >= 75 ? 'PROGRESSING' : 'EARLY_STAGE',
    blocker: isBlocked ? blockerLabel : null,
    localAiNeed: lens.localAiNeed,
    productLens: {
      competitors: lens.competitors,
      blockers: lens.blockers,
      localAiNeed: lens.localAiNeed,
    },
    priorityProducts: product.status === 'active' ? 'high' : product.status === 'paused' ? 'medium' : 'low'
  };
}

async function main() {
  const summaryOnly = process.argv.includes('--summary-only');
  const strictModules = process.argv.includes('--strict-modules');

  const moduleReport = runOrchestrationModules({
    failOpen: !strictModules,
    skipExecution: summaryOnly,
  });

  // Support R&D pipeline input — score INVEST ideas alongside existing products
  const rndInput = process.argv.includes('--rnd-input') ? process.argv[process.argv.indexOf('--rnd-input') + 1] : null;
  let rndProducts = [];
  
  if (rndInput) {
    const rnd = loadJSON(path.resolve(rndInput));
    if (rnd?.investIdeas?.length) {
      rndProducts = rnd.investIdeas.map(idea => ({
        id: idea.id || `rnd-${idea.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,
        name: idea.name,
        status: 'planned',
        plans: 'starter',
        description: idea.description,
        rndScore: idea.totalScore,
        rndCategory: idea.category,
        euRelevance: idea.euRelevance
      }));
      console.log(`\n🔬 R&D Pipeline detected: ${rndProducts.length} INVEST ideas to score`);
    }
  }
  
  const catalog = loadJSON(CATALOG_PATH);
  if (!catalog || !catalog.products) { console.error('No products catalog found'); process.exit(1); }
  const viabilityReport = loadViabilityReport();

  const products = [...catalog.products, ...rndProducts];
  const history = loadJSON(HISTORY_PATH) || { snapshots: [] };
  const currentSnapshot = { generatedAt: new Date().toISOString(), scores: {} };

  console.log(`\n=== PRODUCT DEVELOPMENT ENGINE ===`);
  console.log(`Products to score: ${products.length}${rndProducts.length ? ` (${catalog.products.length} existing + ${rndProducts.length} R&D)` : ''}`);

  const allResults = [];
  let highScoreCount = 0;

  for (const product of products) {
    const scoreData = scoreProduct(product, BENCHMARKS);
    const viabilityEntry = getViabilityEntry(viabilityReport, product.id);
    const roadmap = generateRoadmap(product, scoreData, BENCHMARKS, viabilityEntry);
    const bm = BENCHMARKS[product.id];

    currentSnapshot.scores[product.id] = {
      name: product.name,
      score: scoreData.finalScore,
      tier: scoreData.classification.tier,
      status: product.status,
      viability: viabilityEntry?.viability?.status || null,
      dimensions: {
        documentation: scoreData.dimensions?.find(d => d.id === 'documentation')?.score || 0,
        integration_depth: scoreData.dimensions?.find(d => d.id === 'integration_depth')?.score || 0,
        automation_coverage: scoreData.dimensions?.find(d => d.id === 'automation_coverage')?.score || 0,
        monetization_readiness: scoreData.dimensions?.find(d => d.id === 'monetization_readiness')?.score || 0,
        market_fit: scoreData.dimensions?.find(d => d.id === 'market_fit')?.score || 0,
        technical_quality: scoreData.dimensions?.find(d => d.id === 'technical_quality')?.score || 0,
        completion_level: scoreData.dimensions?.find(d => d.id === 'completion_level')?.score || 0,
        competitiveness: scoreData.dimensions?.find(d => d.id === 'competitiveness')?.score || 0
      }
    };

    allResults.push({
      product: { id: product.id, name: product.name, status: product.status, statusReason: product.statusReason },
      viability: viabilityEntry ? {
        status: viabilityEntry.viability?.status || null,
        blockers: viabilityEntry.viability?.blockers || [],
        agentDecision: viabilityEntry.agentDecision || null,
      } : null,
      benchmark: bm ? {
        category: bm.category,
        competitors: bm.comparableProducts,
        avgCompetitorRating: scoreData.avgCompetitor,
        maxCompetitorRating: scoreData.maxCompetitor
      } : null,
      score: scoreData.finalScore,
      classification: scoreData.classification,
      dimensions: scoreData.scores,
      gaps: scoreData.gaps,
      roadmap
    });

    if (scoreData.finalScore >= 95) highScoreCount++;
  }

  allResults.sort((a, b) => b.score - a.score);

  const engineReady = allResults.filter(r => r.score >= 95);
  const targetProducts95 = allResults.filter(r => r.roadmap.targetScore95 >= 95 || r.score >= 95);
  const targetProducts90 = allResults.filter(r => r.score >= 90 && r.score < 95);

  history.snapshots.push({
    generatedAt: currentSnapshot.generatedAt,
    scores: { ...currentSnapshot.scores },
    engineScore: Math.round(allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length)
  });
  if (history.snapshots.length > 100) history.snapshots = history.snapshots.slice(-100);
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));

  const report = {
    generatedAt: currentSnapshot.generatedAt,
    engine: {
      averageScore: Math.round(allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length),
      productsAt95: engineReady.length,
      productsOnTrack95: targetProducts95.length,
      productsAt90plus: allResults.filter(r => r.score >= 90).length,
      productsAt75plus: allResults.filter(r => r.score >= 75).length,
      totalBenchmarks: Object.keys(BENCHMARKS).length,
      totalCompetitors: Object.values(BENCHMARKS).reduce((sum, b) => sum + b.comparableProducts.length, 0),
      estimatedTotalEffortHours: allResults.reduce((sum, r) => sum + r.roadmap.estimatedHours, 0),
    },
    productResults: allResults,
    priorityQueue: {
      p0_engine_ready: targetProducts95.filter(r => r.score >= 95),
      p1_target_95: allResults.filter(r => r.score < 95 && r.score >= 75).slice(0, 5),
      p2_waiting_for_refinement: allResults.filter(r => r.score < 75),
      p3_potential_backlog: allResults.filter(r => r.product.status === 'planned')
    }
  };

  fs.writeFileSync(SCORES_PATH, JSON.stringify(report, null, 2));

  const wavePlan = buildWavePlan(allResults);
  fs.writeFileSync(WAVE_PLAN_PATH, JSON.stringify(wavePlan, null, 2));

  const roadmaps = {};
  for (const r of allResults) roadmaps[r.product.id] = r.roadmap;
  fs.writeFileSync(ROADMAPS_PATH, JSON.stringify(roadmaps, null, 2));

  console.log(`\n=== SCORES ===`);
  for (const r of allResults) {
    const cls = r.classification;
    console.log(`${cls.color} ${r.product.name}: ${r.score}/100 [${cls.tier}] ${cls.label}`);
    console.log(`   Gaps: ${r.gaps.slice(0, 3).map(g => `${g.dimension} (${g.score})`).join(', ')}`);
    console.log(`   Roadmap: ${r.roadmap.steps.length} steps, ~${r.roadmap.estimatedHours}h, ${r.roadmap.status}`);
    if (r.benchmark) {
      console.log(`   Benchmark: ${r.benchmark.category} | Competidores: ${r.benchmark.competitors.length} | Avg: ${Math.round(r.benchmark.avgCompetitorRating)}%`);
    }
    console.log('');
  }

  console.log(`=== ENGINE SUMMARY ===`);
  console.log(`Average product score: ${report.engine.averageScore}/100`);
  console.log(`Products at 95%+: ${report.engine.productsAt95}/${products.length}`);
  console.log(`Products on track for 95%: ${report.engine.productsOnTrack95}/${products.length}`);
  console.log(`Products at 90%+: ${report.engine.productsAt90plus}/${products.length}`);
  console.log(`Benchmarks analyzed: ${report.engine.totalBenchmarks} categories, ${report.engine.totalCompetitors} competitors`);
  console.log(`Estimated effort: ${report.engine.estimatedTotalEffortHours}h (${Math.ceil(report.engine.estimatedTotalEffortHours / 8)} sprints)`);
  console.log(`\nP0 — Engine Ready (95%+): ${report.priorityQueue.p0_engine_ready.map(r => r.product.name).join(', ') || 'Ninguno aún'}`);
  console.log(`P1 — Target 95%: ${report.priorityQueue.p1_target_95.map(r => `${r.product.name} (${r.score})`).join(', ')}`);
  console.log(`P2 — Waiting (refinement): ${report.priorityQueue.p2_waiting_for_refinement.map(r => r.product.name).join(', ') || 'Ninguno'}`);
  console.log(`P3 — Backlog: ${report.priorityQueue.p3_potential_backlog.map(r => r.product.name).join(', ') || 'Ninguno'}`);

  const dash = loadJSON(DASHBOARD_PATH) || {};
  dash.productEngine = {
    generatedAt: report.generatedAt,
    engine: report.engine,
    topProducts: report.productResults.slice(0, 5).map(r => ({
      name: r.product.name, score: r.score, tier: r.classification.tier, status: r.product.status
    })),
    priorityQueue: {
      target95: report.priorityQueue.p1_target_95.map(r => r.product.name),
      engineReady: report.priorityQueue.p0_engine_ready.map(r => r.product.name),
    }
    ,
    moduleHealth: {
      flowStatus: moduleReport.flowStatus,
      failOpen: moduleReport.failOpen,
      alerts: moduleReport.alerts.length,
      bypassedModules: moduleReport.summary.bypassed,
      failedModules: moduleReport.summary.failed,
    },
    wavePlan: {
      waves: wavePlan.totals.waves,
      plannedOverall: wavePlan.totals.plannedOverall,
      plannedProducts: wavePlan.totals.plannedProducts,
      plannedHybrids: wavePlan.totals.plannedHybrids,
      maxProducts: wavePlan.policy.maxProducts,
    }
  };
  fs.writeFileSync(DASHBOARD_PATH, JSON.stringify(dash, null, 2));
  console.log(`\nDashboard data updated.`);
  console.log(`Module health: ${moduleReport.flowStatus} | bypassed ${moduleReport.summary.bypassed} | failed ${moduleReport.summary.failed}`);
  console.log(`Wave plan: ${wavePlan.totals.waves} waves | ${wavePlan.totals.plannedProducts} products + ${wavePlan.totals.plannedHybrids} hybrids (max ${wavePlan.policy.maxProducts})`);
}

main().catch(err => { console.error(`FATAL: ${err.message}`); process.exit(1); });
