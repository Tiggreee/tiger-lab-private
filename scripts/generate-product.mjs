#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [, , repo, type = 'saas'] = process.argv;

if (!repo) {
  console.error('Uso: generate-product.mjs <repo> [type]');
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

fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');

const releasesDir = path.resolve('ops/releases');
ensureDirectory(releasesDir);
const releasePath = path.join(releasesDir, `${productId}.json`);
const releaseManifest = {
  productId,
  name: productName,
  type: productType,
  status: 'generated',
  generatedAt: new Date().toISOString(),
  version: '0.1.0'
};
fs.writeFileSync(releasePath, `${JSON.stringify(releaseManifest, null, 2)}\n`, 'utf8');

process.stdout.write(
  `${JSON.stringify({
    ok: true,
    command: 'generate-product',
    data: {
      productId,
      name: productName,
      type: productType,
      planIds: nextPlans,
      operation,
      catalogPath,
      releaseManifestPath: releasePath
    }
  })}\n`
);
