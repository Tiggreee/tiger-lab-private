import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OPS = join(ROOT, 'ops');
const RUNTIME = join(OPS, 'runtime');
const CATALOG = join(OPS, 'catalog', 'products.json');
const OUTPUT = join(RUNTIME, 'pricing.json');
const RULES_PATH = join(OPS, 'catalog', 'pricing-rules.json');
const DASH_PATH = join(RUNTIME, 'dashboard-unified.json');

function readJSON(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, 'utf-8')); }
  catch { return fallback; }
}

function main() {
  console.log('MonetizationEngine — generating pricing recommendations...\n');

  const products = readJSON(CATALOG, {});
  const items = products.products || products || [];
  const allPlans = readJSON(join(OPS, 'catalog', 'plans.json'), {});
  const pricingRules = readJSON(RULES_PATH, { pricingRules: [], salesThresholds: {} });
  const planMap = {};
  for (const pl of (allPlans.plans || [])) {
    planMap[pl.id] = pl;
  }

  if (!Array.isArray(items) || items.length === 0) {
    console.warn('No products found in catalog');
    return;
  }

  const rules = pricingRules.pricingRules || [];
  const thresholds = pricingRules.salesThresholds || {};
  const marketRates = pricingRules.marketRates || { starter: 39, pro: 99, enterprise: 249 };
  const pipeline = readJSON(join(OPS, 'leads', 'pipeline.json'), { leads: [], stats: {} });
  const connectedCount = pipeline.leads.filter(l => l.status === 'contacted').length;
  const convertedCount = pipeline.leads.filter(l => l.status === 'converted').length;

  const plans = [];
  for (const p of items) {
    const pplans = (p.planIds || []).map(id => planMap[id]).filter(Boolean);
    if (pplans.length === 0) {
      console.log(`  ${p.id}: no plans resolved, skipping`);
      continue;
    }
    for (const plan of pplans) {
      plans.push({
        productId: p.id,
        productName: p.name || p.id,
        planName: plan.name,
        price: plan.priceMonthly || 0,
        currency: plan.currency || 'USD',
        billing: 'monthly',
        tier: plan.tier || 1,
        status: p.status || 'active',
        suggestedPrice: plan.priceMonthly,
        marketRate: marketRates[plan.id] || plan.priceMonthly,
        productScore: p.score || null,
        justification: ''
      });
    }
  }

  const recommendations = [];
  for (const p of plans) {
    const ruleMatch = rules.find(r => r.productId === p.productId && r.planId === p.planId);
    if (ruleMatch && ruleMatch.action === 'increase') {
      const newPrice = Math.round(p.price * (1 + (ruleMatch.percent || 0) / 100));
      recommendations.push({
        product: p.productName,
        plan: p.planName,
        action: 'increase',
        currentPrice: p.price,
        suggestedPrice: newPrice,
        reason: ruleMatch.reason || `Market opportunity: ${p.planName} priced below comparable offerings at $${p.marketRate}/mo`,
        confidence: ruleMatch.confidence || 70
      });
    } else if (p.status === 'paused') {
      recommendations.push({
        product: p.productName,
        plan: p.planName,
        action: 'hold',
        currentPrice: p.price,
        suggestedPrice: p.price,
        reason: 'Producto pausado — habilitar pricing al resolver blocker (PAC Finkok)',
        confidence: 100
      });
    } else if (p.status === 'planned') {
      recommendations.push({
        product: p.productName,
        plan: p.planName,
        action: 'set-launch',
        currentPrice: 0,
        suggestedPrice: p.marketRate,
        reason: `Precio de lanzamiento alineado a mercado: $${p.marketRate}/mo. Ajustar tras 3 meses.`,
        confidence: 85
      });
    } else if (p.price < p.marketRate * 0.85) {
      recommendations.push({
        product: p.productName,
        plan: p.planName,
        action: 'increase',
        currentPrice: p.price,
        suggestedPrice: p.marketRate,
        reason: `${p.planName} a $${p.price}/mo esta ${Math.round((1 - p.price / p.marketRate) * 100)}% debajo del mercado ($${p.marketRate}).`,
        confidence: 80
      });
    } else {
      recommendations.push({
        product: p.productName,
        plan: p.planName,
        action: 'maintain',
        currentPrice: p.price,
        suggestedPrice: p.price,
        reason: `Precio competitivo. Monitorear conversion y demanda. ${p.productScore ? 'Score: ' + p.productScore + '/100' : ''}`,
        confidence: 90
      });
    }
  }

  const alerts = plans
    .filter(p => p.status !== 'active')
    .map(p => ({
      product: p.productName,
      plan: p.planName,
      severity: 'warning',
      message: `Producto ${p.status} — no puede venderse hasta resolver blocker`,
      blocker: p.status === 'paused' ? 'Requiere PAC Finkok' : 'Requiere desarrollo'
    }));

  const revenue = {
    totalMonthly: plans.filter(p => p.status === 'active').reduce((s, p) => s + p.price, 0),
    projectedMonthly: plans.reduce((s, p) => s + (p.status !== 'active' ? p.price * 0.3 : p.price), 0),
    currency: 'USD',
    activeProductCount: plans.filter(p => p.status === 'active').length,
    productsInPipeline: items.filter(p => p.status !== 'active').length
  };

  const report = {
    generatedAt: new Date().toISOString(),
    totalPlans: plans.length,
    plans,
    revenue,
    recommendations,
    actions: {
      increase: recommendations.filter(r => r.action === 'increase').length,
      maintain: recommendations.filter(r => r.action === 'maintain').length,
      hold: recommendations.filter(r => r.action === 'hold').length,
      setLaunch: recommendations.filter(r => r.action === 'set-launch').length
    },
    pipelineHealth: {
      connectedLeads: connectedCount,
      convertedLeads: convertedCount,
      conversionRate: connectedCount > 0 ? Math.round(convertedCount / connectedCount * 100) : 0,
      targetConversion: 15,
      status: convertedCount > 0 ? 'active' : 'cold-start'
    },
    alerts
  };

  mkdirSync(RUNTIME, { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(report, null, 2), 'utf-8');

  const dash = readJSON(DASH_PATH, {});
  dash.monetization = {
    generatedAt: report.generatedAt,
    revenue: report.revenue,
    recommendations: report.actions,
    pipelineHealth: report.pipelineHealth,
    topPlans: plans.slice(0, 5).map(p => ({
      product: p.productName,
      plan: p.planName,
      price: p.price,
      status: p.status
    }))
  };
  writeFileSync(DASH_PATH, JSON.stringify(dash, null, 2));

  console.log(`  ${plans.length} plans across ${items.length} products`);
  console.log(`  Active monthly revenue: $${report.revenue.totalMonthly}`);
  console.log(`  Projected monthly revenue: $${report.revenue.projectedMonthly}`);
  console.log(`  Pricing actions: ${JSON.stringify(report.actions)}`);
  console.log(`  Pipeline: ${connectedCount} contacted, ${convertedCount} converted`);
  console.log(`  Alerts: ${report.alerts.length}`);
  console.log(`\nSaved: ${OUTPUT}`);
  console.log(`Dashboard: ${DASH_PATH}`);
}

main();
