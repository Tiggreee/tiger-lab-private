#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [, , product, type = 'post', channel = 'web'] = process.argv;

if (!product) {
  console.error('Uso: generate-content.mjs <product|--all> [type] [channel]');
  process.exit(1);
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readRuntimeState(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      leads: {},
      leadScores: {},
      payments: {},
      accounts: {},
      assets: {},
      publications: {}
    };
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      leads: {},
      leadScores: {},
      payments: {},
      accounts: {},
      assets: {},
      publications: {}
    };
  }
}

function loadCatalog() {
  const catalogPath = path.resolve('ops/catalog/products.json');
  if (!fs.existsSync(catalogPath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    return data.products || [];
  } catch {
    return [];
  }
}

function loadPlans() {
  const plansPath = path.resolve('ops/catalog/plans.json');
  if (!fs.existsSync(plansPath)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(plansPath, 'utf8'));
    const map = {};
    for (const p of (data.plans || [])) map[p.id] = p;
    return map;
  } catch {
    return {};
  }
}

const TONES = {
  web: { style: 'tecnico, SEO-friendly', maxLines: 40, channelType: 'blog' },
  linkedin: { style: 'thought-leadership, profesional', maxLines: 25, channelType: 'post' },
  docs: { style: 'tecnico, changelog', maxLines: 20, channelType: 'changelog' },
  twitter: { style: 'directo, punchy, CTA', maxLines: 10, channelType: 'tweet' },
  telegram: { style: 'directo, propositivo, enlace', maxLines: 8, channelType: 'mensaje' }
};

function generateBodyForProduct(prod, planMap, tone) {
  const name = prod.name || prod.id;
  const score = prod.score || 'N/A';
  const tier = prod.tier || 'P?';
  const status = prod.status || 'active';
  const planIds = prod.planIds || [];
  const plans = planIds.map(id => planMap[id]).filter(Boolean);
  const cheapestPrice = plans.length > 0 ? Math.min(...plans.map(p => p.priceMonthly || 0)) : 39;
  const planNames = plans.map(p => p.name).join('/');
  const target95 = prod.targetTo95 || 'Refinamiento general';
  const benchmark = prod.benchmarkCategory || 'Automatizacion SMB';

  if (tone.channelType === 'changelog') {
    return `# ${name} — Technical Update\n\n## Status\n${status === 'active' ? 'Active' : status} | Score: ${score}/100 | Tier: ${tier}\n\n## Changes\n- Product tracked in ${benchmark} benchmark category\n- Plans available: ${planNames} (${cheapestPrice}/mo)\n- Path to 95%: ${target95}\n\n## Integration\n\`\`\`bash\n# API access via X-API-Key header\ncurl -H "X-API-Key: $TIGERLAB_KEY" https://api.tigerlab.dev/${prod.id}/status\n\`\`\`\n`;
  }

  if (tone.channelType === 'tweet') {
    return `${name} para SMBs Mexicanas.\n\n✅ Automatizacion ${benchmark.toLowerCase()}\n✅ Planes desde $${cheapestPrice}/mo · ${planNames}\n\nSin equipo tecnico. Resultados en 24h.\n→ Agenda diagnostico: https://cal.com/victor-tigerlab/diagnostic`;
  }

  return `# ${name} — ${benchmark}\n\n## El Problema Operativo\nLas SMBs en Mexico gastan 10+h/semana en procesos manuales dentro de ${benchmark.toLowerCase()}. Sin un equipo tecnico dedicado, estas tareas consumen el margen operativo y frenan el crecimiento.\n\n## La Solucion: ${name}\n\n${name} (Score: ${score}/100, Tier: ${tier}) es la respuesta construida especificamente para este problema:\n\n- Built on Node.js 20+ y TypeScript\n- Planes desde $${cheapestPrice}/mo (${planNames})\n- Sin contratos largos, sin equipo tecnico necesario\n- Path a produccion: ${target95}\n\n## Prueba Concreta\nEquipos que migraron de procesos manuales a ${name} reportan reduccion de 60-80% en tiempo operativo en las primeras 2 semanas.\n\n## CTA\nAgenda tu diagnostico gratuito de 15 min: https://cal.com/victor-tigerlab/diagnostic\n\n---\nGenerated: ${new Date().toISOString()} | Product: ${prod.id}`;
}

function generateAllProducts() {
  const catalog = loadCatalog();
  const planMap = loadPlans();
  const activeProducts = catalog.filter(p => p.status === 'active');
  const results = [];

  ensureDirectory(path.resolve('ops/content'));

  for (const prod of activeProducts) {
    for (const [ch, tone] of Object.entries(TONES)) {
      const safeProduct = prod.id.trim().toLowerCase();
      const contentId = `asset-${crypto.randomUUID().slice(0, 8)}`;
      const generatedAt = new Date().toISOString();
      const filePath = path.join(path.resolve('ops/content'), `${safeProduct}-${tone.channelType}-${ch}.md`);
      const body = generateBodyForProduct(prod, planMap, tone);

      fs.writeFileSync(filePath, body, 'utf8');

      results.push({
        contentId,
        productId: safeProduct,
        channel: ch,
        type: tone.channelType,
        file: filePath,
        bytes: body.length
      });
    }
  }

  return results;
}

const safeProduct = product.trim().toLowerCase();

if (safeProduct === '--all') {
  const results = generateAllProducts();
  const runtimePath = path.resolve('ops/runtime/runtime-state.json');
  ensureDirectory(path.dirname(runtimePath));
  const runtimeState = readRuntimeState(runtimePath);
  runtimeState.assets = runtimeState.assets || {};

  for (const r of results) {
    runtimeState.assets[r.contentId] = {
      assetId: r.contentId,
      productId: r.productId,
      channel: r.channel,
      type: r.type,
      generatedAt: new Date().toISOString()
    };
  }
  fs.writeFileSync(runtimePath, `${JSON.stringify(runtimeState, null, 2)}\n`, 'utf8');

  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      command: 'generate-content',
      mode: 'all',
      data: {
        totalGenerated: results.length,
        products: [...new Set(results.map(r => r.productId))],
        channels: Object.keys(TONES)
      }
    })}\n`
  );
} else {
  const catalog = loadCatalog();
  const planMap = loadPlans();
  const prod = catalog.find(p => p.id === safeProduct);

  if (!prod) {
    console.error(`Product not found: ${safeProduct}. Available: ${catalog.map(p => p.id).join(', ') || 'none'}`);
    process.exit(1);
  }

  const safeType = type.trim().toLowerCase();
  const safeChannel = channel.trim().toLowerCase();
  const contentId = `asset-${crypto.randomUUID().slice(0, 8)}`;
  const generatedAt = new Date().toISOString();

  const contentDir = path.resolve('ops/content');
  ensureDirectory(contentDir);
  const filePath = path.join(contentDir, `${safeProduct}-${safeType}-${safeChannel}.md`);

  const tone = TONES[safeChannel] || TONES['web'];
  const body = generateBodyForProduct(prod, planMap, tone);

  fs.writeFileSync(filePath, body, 'utf8');

  const runtimePath = path.resolve('ops/runtime/runtime-state.json');
  ensureDirectory(path.dirname(runtimePath));
  const runtimeState = readRuntimeState(runtimePath);
  runtimeState.assets = runtimeState.assets || {};
  runtimeState.assets[contentId] = {
    assetId: contentId,
    productId: safeProduct,
    body,
    generatedAt
  };
  fs.writeFileSync(runtimePath, `${JSON.stringify(runtimeState, null, 2)}\n`, 'utf8');

  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      command: 'generate-content',
      data: {
        contentId,
        product: safeProduct,
        type: safeType,
        channel: safeChannel,
        file: filePath
      }
    })}\n`
  );
}
