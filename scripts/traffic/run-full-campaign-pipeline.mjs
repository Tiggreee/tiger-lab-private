#!/usr/bin/env node
/**
 * run-full-campaign-pipeline.mjs
 *
 * 100% automated. Zero human parameters needed.
 * Reads catalog → threads → generates copy → generates PNG cards.
 *
 * Usage:
 *   node scripts/traffic/run-full-campaign-pipeline.mjs
 *   node scripts/traffic/run-full-campaign-pipeline.mjs --dryRun
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const PRODUCT_CONFIGS = {
  'docflow-api': {
    problemDetail: 'flujos documentales manuales que consumen 8-12h por semana y generan errores de trazabilidad',
    primaryOutcome: 'automatizacion completa de flujos CFDI y documentos con API sin friccion',
    proofPoint: 'Empresas SMB reducen 80% del tiempo operativo en docflow con integracion en menos de 1 dia',
    domainTerms: 'cfdi,api,timbrado,documentos,workflow,automatizacion,integracion,xml',
    audience: 'founders y dev leads de SMBs en Mexico con operaciones documentales manuales',
    offer: 'Diagnostico de integracion gratuito en 15 min con plan de activacion en 24h',
    closeChannel: 'calendar',
    closeDestination: 'https://cal.com/victor-tigerlab/diagnostic',
  },
  'script-premium-kit': {
    problemDetail: 'procesos repetitivos que el equipo ejecuta manualmente cada semana sin estandar ni trazabilidad',
    primaryOutcome: 'runbooks ejecutables y scripts listos para produccion que eliminan trabajo manual recurrente',
    proofPoint: 'Equipos de 3-15 personas eliminan 10+ horas semanales de trabajo repetitivo con scripts estandarizados',
    domainTerms: 'scripts,automatizacion,runbook,ops,procesos,smb,eficiencia,estandar',
    audience: 'operadores y founders SMB que siguen ejecutando procesos manuales cada semana',
    offer: 'Kit de scripts premium listo para usar desde el dia 1 con soporte de activacion',
    closeChannel: 'calendar',
    closeDestination: 'https://cal.com/victor-tigerlab/diagnostic',
  },
};

const BASE_LINK = process.env.SOCIAL_BASE_LINK || 'https://cal.com/victor-tigerlab/diagnostic';

function sh(args, label) {
  process.stdout.write(`\n▶ ${label}\n`);
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 1}`);
  }
}

function loadCatalog() {
  const raw = fs.readFileSync(path.join(ROOT, 'ops/catalog/products.json'), 'utf8');
  const data = JSON.parse(raw);
  return (data.products || []).filter((p) => p.status === 'active');
}

function loadPlans() {
  const raw = fs.readFileSync(path.join(ROOT, 'ops/catalog/plans.json'), 'utf8');
  const data = JSON.parse(raw);
  const map = {};
  for (const plan of (data.plans || [])) {
    map[plan.id] = plan;
  }
  return map;
}

function getMinPrice(product, plans) {
  const planIds = product.planIds || [];
  const prices = planIds.map((id) => plans[id]?.priceMonthly).filter(Number.isFinite);
  return prices.length > 0 ? Math.min(...prices) : 39;
}

function parseArgs(argv) {
  const options = { dryRun: false };
  for (const item of argv) {
    if (item === '--dryRun' || item === '--dry-run') options.dryRun = true;
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const activeProducts = loadCatalog();
  const plans = loadPlans();
  const today = new Date().toISOString().slice(0, 10);

  if (activeProducts.length === 0) {
    throw new Error('No active products found in catalog. Cannot generate campaigns.');
  }

  process.stdout.write(`\n=== CAMPAIGN PIPELINE — ${today} ===\n`);
  process.stdout.write(`Active products: ${activeProducts.map((p) => p.name).join(', ')}\n`);
  process.stdout.write(`Dry run: ${options.dryRun}\n`);

  // Step 1: Fetch real threads once (shared across all products)
  sh([
    'scripts/traffic/fetch-real-threads.mjs',
    '--outDir', 'ops/traffic/research',
    '--perQuery', '20',
    '--maxThreads', '20',
    '--minComments', '1',
    '--minBodyChars', '80',
    '--minRelevanceScore', '2',
    '--minThreads', '5',
  ], 'Fetch real threads');

  const results = [];

  // Step 2: Per product → threaded campaign → cards
  for (const product of activeProducts) {
    const cfg = PRODUCT_CONFIGS[product.id];
    if (!cfg) {
      process.stdout.write(`\n⚠  No config for product "${product.id}", skipping.\n`);
      continue;
    }

    const minPrice = getMinPrice(product, plans);
    const campaignId = `${product.id}-${today}`;

    process.stdout.write(`\n--- Product: ${product.name} (${product.id}) ---\n`);

    // Generate thread-backed social pack
    sh([
      'scripts/traffic/generate-thread-backed-social-pack.mjs',
      '--threadsPath', 'ops/traffic/research/real-threads-latest.json',
      '--campaign', campaignId,
      '--baseLink', BASE_LINK,
      '--closeChannel', cfg.closeChannel,
      '--closeDestination', cfg.closeDestination,
      '--productName', product.name,
      '--audience', cfg.audience,
      '--offer', cfg.offer,
      '--outDir', 'ops/traffic/outbox',
      '--minThreads', '5',
    ], `Generate pack: ${product.name}`);

    // Override brand fields in the pack with catalog-precise values
    const packPath = path.join(ROOT, 'ops/traffic/outbox', `social-pack-${campaignId}.json`);
    if (fs.existsSync(packPath)) {
      const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
      pack.brand = {
        ...pack.brand,
        productName: product.name,
        problemDetail: cfg.problemDetail,
        primaryOutcome: cfg.primaryOutcome,
        proofPoint: `${cfg.proofPoint} Precio desde $${minPrice}/mo.`,
        domainTerms: cfg.domainTerms.split(',').map((t) => t.trim()),
      };
      pack.topic = `${product.name}: ${cfg.primaryOutcome}`;
      pack.audience = cfg.audience;
      pack.offer = cfg.offer;
      fs.writeFileSync(packPath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
    }

    // Generate PNG cards
    if (!options.dryRun) {
      sh([
        'scripts/traffic/generate-campaign-cards.mjs',
        '--campaign', campaignId,
        '--outDir', 'ops/traffic/outbox',
      ], `Generate cards: ${product.name}`);
    }

    results.push({ product: product.name, campaign: campaignId, packPath: `ops/traffic/outbox/social-pack-${campaignId}.json` });
  }

  // Step 3: Write pipeline run summary
  const summary = {
    pipelineRunAt: new Date().toISOString(),
    today,
    dryRun: options.dryRun,
    activeProducts: activeProducts.map((p) => p.name),
    campaigns: results,
  };
  const summaryPath = path.join(ROOT, 'ops/traffic/outbox', `pipeline-run-${today}.json`);
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  process.stdout.write(`\n=== PIPELINE COMPLETE ===\n`);
  for (const r of results) {
    process.stdout.write(`  ✓ ${r.product}: ${r.campaign}\n`);
  }
  process.stdout.write(`Summary: ${path.relative(ROOT, summaryPath)}\n`);
}

main().catch((err) => {
  process.stderr.write(`Pipeline failed: ${err.message}\n`);
  process.exit(1);
});
