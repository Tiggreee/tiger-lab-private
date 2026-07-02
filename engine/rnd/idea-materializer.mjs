#!/usr/bin/env node
/**
 * Idea Materializer — engine/rnd/idea-materializer.mjs
 *
 * Closes the discovery -> development gap: converts INVEST ideas produced by
 * rnd-engine.mjs (ops/runtime/rnd-pipeline.json) into DRAFT entries in the
 * product catalog (ops/catalog/products.json) so the development engine can
 * score and track them.
 *
 * Safety:
 * - Idempotent: an idea already present in the catalog (by id) is skipped.
 * - New products are created with status 'draft' and never 'active'; they are
 *   NOT shippable until a human promotes them. This keeps the go-live gate honest.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PIPELINE_PATH = resolve('ops/runtime/rnd-pipeline.json');
const CATALOG_PATH = resolve('ops/catalog/products.json');

function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function tierForScore(score) {
  if (score >= 95) return 'P5';
  if (score >= 85) return 'P4';
  if (score >= 70) return 'P3';
  if (score >= 50) return 'P2';
  return 'P1';
}

export function materializeIdeas() {
  if (!existsSync(PIPELINE_PATH)) {
    return { status: 'skipped', reason: 'No rnd-pipeline.json. Run rnd-engine first.', added: [] };
  }
  if (!existsSync(CATALOG_PATH)) {
    return { status: 'error', reason: 'Missing ops/catalog/products.json', added: [] };
  }

  const pipeline = JSON.parse(readFileSync(PIPELINE_PATH, 'utf8'));
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  const products = Array.isArray(catalog.products) ? catalog.products : [];
  const existingIds = new Set(products.map((p) => p.id));

  const invest = Array.isArray(pipeline.investIdeas) ? pipeline.investIdeas : [];
  const added = [];

  for (const idea of invest) {
    const id = slugify(idea.name);
    if (!id || existingIds.has(id)) continue;

    const score = Number(idea.totalScore) || 0;
    products.push({
      id,
      name: idea.name,
      status: 'draft',
      statusReason: 'Auto-materialized from R&D discovery. Requires human promotion before go-live.',
      planIds: ['starter'],
      score,
      tier: tierForScore(score),
      targetTo95: 'Validate demand, build MVP, wire monetization',
      benchmarkCategory: idea.category || 'uncategorized',
      origin: {
        source: 'rnd-discovery',
        rndId: idea.id || null,
        discoveredAt: pipeline.generatedAt || new Date().toISOString()
      }
    });
    existingIds.add(id);
    added.push({ id, name: idea.name, score });
  }

  if (added.length > 0) {
    catalog.products = products;
    catalog.updatedAt = new Date().toISOString();
    writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
  }

  return { status: 'ok', added, totalInvest: invest.length, skipped: invest.length - added.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = materializeIdeas();
  console.log('=== IDEA MATERIALIZER ===');
  console.log(`INVEST ideas: ${result.totalInvest ?? 0}`);
  if (result.status !== 'ok') {
    console.log(`Status: ${result.status} — ${result.reason || ''}`);
  } else if (result.added.length === 0) {
    console.log('No new products (all INVEST ideas already in catalog).');
  } else {
    console.log(`Materialized ${result.added.length} draft product(s):`);
    result.added.forEach((p) => console.log(`  + ${p.id} (score ${p.score})`));
  }
}
