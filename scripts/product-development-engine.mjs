#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const CATALOG_PATH = path.resolve('ops/catalog/products.json');
const BENCHMARKS_PATH = path.resolve('ops/catalog/benchmarks.json');
const SCORES_PATH = path.resolve('ops/runtime/product-scores.json');
const ROADMAPS_PATH = path.resolve('ops/runtime/product-roadmaps.json');
const HISTORY_PATH = path.resolve('ops/runtime/product-score-history.json');
const DASHBOARD_PATH = path.resolve('ops/runtime/dashboard-unified.json');

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

const BENCHMARKS = {
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

function loadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
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

function generateRoadmap(product, score, benchmarks) {
  const bmData = benchmarks[product.id];
  const steps = [];
  const target95 = 95 - score.finalScore;
  const target90 = 90 - score.finalScore;

  if (score.finalScore >= 95) {
    steps.push({ priority: 'P0', action: 'Mantener — engine grade, monitorear competidores', effort: 'bajo', owner: 'ai' });
    return { currentScore: score.finalScore, targetScore: 95, steps, status: 'PRODUCTION_READY' };
  }

  // Auto-generate steps based on gaps
  for (const gap of score.gaps) {
    if (gap.gap <= 0) continue;
    let action = '';
    let effort = 'medio';

    if (gap.dimension === 'Market Fit') {
      action = `Investigar mercado para ${product.name}: entrevistar 5 prospects, validar propuesta de valor`;
      effort = 'medio';
    } else if (gap.dimension === 'Technical Quality') {
      action = `Hardening técnico: tests, types, error handling, performance para ${product.name}`;
      effort = 'alto';
    } else if (gap.dimension === 'Monetization Readiness') {
      action = `Configurar pricing + checkout + payment integration para ${product.name}`;
      effort = 'medio';
    } else if (gap.dimension === 'Completion Level') {
      action = `Completar features core faltantes de ${product.name}: revisar backlog y priorizar`;
      effort = 'alto';
    } else if (gap.dimension === 'Competitiveness vs Benchmarks') {
      const top = bmData?.comparableProducts?.[0];
      action = `Benchmark contra ${top?.name || 'competidores'}: implementar features diferenciadores clave`;
      effort = 'alto';
    } else if (gap.dimension === 'Automation Coverage') {
      action = `Automatizar CI/CD, tests, deploy para ${product.name}`;
      effort = 'medio';
    } else if (gap.dimension === 'Documentation & Onboarding') {
      action = `Crear README, API docs, onboarding guide para ${product.name}`;
      effort = 'bajo';
    } else if (gap.dimension === 'Integration Depth') {
      action = `Agregar integraciones clave (Stripe, GitHub, Slack, Email) para ${product.name}`;
      effort = 'medio';
    }

    steps.push({ priority: gap.gap > 20 ? 'P0' : gap.gap > 10 ? 'P1' : 'P2', action, effort, owner: gap.gap > 15 ? 'human' : 'ai', gap: gap.gap });
  }

  // Ensure we have at least 3 steps
  if (steps.length < 3) {
    steps.push({ priority: 'P2', action: `Revisión general de calidad para ${product.name}`, effort: 'bajo', owner: 'ai', gap: 0 });
    steps.push({ priority: 'P2', action: `Actualizar documentación y ejemplos de ${product.name}`, effort: 'bajo', owner: 'ai', gap: 0 });
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
    status: score.finalScore >= 90 ? 'CLOSE_TO_TARGET' : score.finalScore >= 75 ? 'PROGRESSING' : 'EARLY_STAGE',
    priorityProducts: product.status === 'active' ? 'high' : product.status === 'paused' ? 'medium' : 'low'
  };
}

async function main() {
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

  const products = [...catalog.products, ...rndProducts];
  const history = loadJSON(HISTORY_PATH) || { snapshots: [] };
  const currentSnapshot = { generatedAt: new Date().toISOString(), scores: {} };

  console.log(`\n=== PRODUCT DEVELOPMENT ENGINE ===`);
  console.log(`Products to score: ${products.length}${rndProducts.length ? ` (${catalog.products.length} existing + ${rndProducts.length} R&D)` : ''}`);

  const allResults = [];
  let highScoreCount = 0;

  for (const product of products) {
    const scoreData = scoreProduct(product, BENCHMARKS);
    const roadmap = generateRoadmap(product, scoreData, BENCHMARKS);
    const bm = BENCHMARKS[product.id];

    currentSnapshot.scores[product.id] = {
      name: product.name,
      score: scoreData.finalScore,
      tier: scoreData.classification.tier,
      status: product.status
    };

    allResults.push({
      product: { id: product.id, name: product.name, status: product.status, statusReason: product.statusReason },
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
  };
  fs.writeFileSync(DASHBOARD_PATH, JSON.stringify(dash, null, 2));
  console.log(`\nDashboard data updated.`);
}

main().catch(err => { console.error(`FATAL: ${err.message}`); process.exit(1); });
