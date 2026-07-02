#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rawArgs = process.argv.slice(2);
const dryRun = rawArgs.some((arg) => arg === '--dry-run' || arg === '--dryRun');
const positional = rawArgs.filter((arg) => !arg.startsWith('-'));
const repo = positional[0];
const type = positional[1] || 'saas';

if (!repo) {
  if (dryRun) {
    // Validate-only invocation without a target repo: no-op success. Used by the
    // development-engine orchestration to exercise the path without writing.
    process.stdout.write(`${JSON.stringify({ ok: true, command: 'generate-product', dryRun: true, operation: 'noop' })}\n`);
    process.exit(0);
  }
  console.error('Uso: generate-product.mjs <repo> [type] [--dry-run]');
  process.exit(1);
}

function normalizeProductId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function planIdsForType(productType) {
  if (productType === 'api') {
    return ['starter', 'pro'];
  }

  if (productType === 'enterprise') {
    return ['starter', 'pro', 'enterprise'];
  }

  return ['starter', 'pro'];
}

function readCatalog(filePath) {
  if (!fs.existsSync(filePath)) {
    return { products: [] };
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.products)) {
      return { products: [] };
    }

    return parsed;
  } catch {
    return { products: [] };
  }
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

const productId = normalizeProductId(repo);
const productName = repo.trim();
const productType = type.trim().toLowerCase();

if (!productId) {
  console.error(`Nombre de producto inválido: '${repo}'. Debe contener caracteres alfanuméricos.`);
  process.exit(1);
}

const catalogPath = path.resolve('ops/catalog/products.json');
ensureDirectory(path.dirname(catalogPath));

const catalog = readCatalog(catalogPath);
const nextPlans = planIdsForType(productType);
const existingIndex = catalog.products.findIndex((item) => item.id === productId);

let operation = 'created';
if (existingIndex >= 0) {
  catalog.products[existingIndex] = {
    ...catalog.products[existingIndex],
    name: productName,
    status: 'active',
    planIds: nextPlans
  };
  operation = 'updated';
} else {
  catalog.products.push({
    id: productId,
    name: productName,
    status: 'active',
    planIds: nextPlans
  });
}

const releasesDir = path.resolve('ops/releases');
const releasePath = path.join(releasesDir, `${productId}.json`);
const releaseManifest = {
  productId,
  name: productName,
  type: productType,
  status: 'generated',
  generatedAt: new Date().toISOString(),
  version: '0.1.0'
};

if (!dryRun) {
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  ensureDirectory(releasesDir);
  fs.writeFileSync(releasePath, `${JSON.stringify(releaseManifest, null, 2)}\n`, 'utf8');
}

process.stdout.write(
  `${JSON.stringify({
    ok: true,
    command: 'generate-product',
    dryRun,
    data: {
      productId,
      name: productName,
      type: productType,
      planIds: nextPlans,
      operation: dryRun ? `${operation}-dry-run` : operation,
      catalogPath,
      releaseManifestPath: releasePath
    }
  })}\n`
);
