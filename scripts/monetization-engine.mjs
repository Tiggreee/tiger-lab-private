import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OPS = join(ROOT, 'ops');
const RUNTIME = join(OPS, 'runtime');
const CATALOG = join(OPS, 'catalog', 'products.json');
const OUTPUT = join(RUNTIME, 'pricing.json');

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
  const planMap = {};
  for (const pl of (allPlans.plans || [])) {
    planMap[pl.id] = pl;
  }

  if (!Array.isArray(items) || items.length === 0) {
    console.warn('No products found in catalog');
    return;
  }

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
        justification: `${plan.name} (Tier ${plan.tier}) para ${p.name || p.id}. Precio de mercado para SMBs en Mexico.`
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totalPlans: plans.length,
    plans,
    revenue: {
      totalMonthly: plans.reduce((s, p) => s + p.price, 0),
      currency: 'USD'
    },
    recommendations: plans
      .filter(p => p.status === 'active')
      .map(p => ({
        product: p.productName,
        plan: p.planName,
        action: 'maintain',
        reason: 'Precio activo y dentro del rango de mercado'
      })),
    alerts: plans
      .filter(p => p.status !== 'active')
      .map(p => ({
        product: p.productName,
        plan: p.planName,
        severity: 'warning',
        message: `Producto ${p.status} — no puede venderse hasta resolver blocker`,
        blocker: p.status === 'paused' ? 'Requiere PAC Finkok' : 'Requiere desarrollo'
      }))
  };

  mkdirSync(RUNTIME, { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`  ${plans.length} plans across ${items.length} products`);
  console.log(`  Total monthly revenue: $${report.revenue.totalMonthly}`);
  console.log(`  Alerts: ${report.alerts.length}`);
  console.log(`\nSaved: ${OUTPUT}`);
}

main();
