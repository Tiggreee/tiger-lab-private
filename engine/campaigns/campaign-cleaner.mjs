#!/usr/bin/env node
/**
 * Campaign Cleaner — engine/campaigns/campaign-cleaner.mjs
 * Regulates campaign pipeline: 1 per product, no duplicates.
 * Keep only latest per product. Archive old. Auto-publish on approve.
 */

import { readdirSync, statSync, rmSync, readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from 'node:fs';
import { resolve, join } from 'node:path';

const CAMPAIGNS_DIR = resolve('ops/runtime/campaigns');
const ARCHIVE_DIR = resolve('ops/runtime/campaigns/archive');
const INDEX_PATH = resolve('ops/runtime/campaigns/index.json');

function getCampaignDirs() {
  return readdirSync(CAMPAIGNS_DIR)
    .filter(f => statSync(join(CAMPAIGNS_DIR, f)).isDirectory())
    .filter(f => f !== 'archive');
}

function getCampaign(dir) {
  const cp = join(CAMPAIGNS_DIR, dir, 'campaign.json');
  if (!existsSync(cp)) return null;
  try { return JSON.parse(readFileSync(cp, 'utf8')); } catch { return null; }
}

function clean() {
  const dirs = getCampaignDirs();
  const campaigns = [];
  
  for (const dir of dirs) {
    const c = getCampaign(dir);
    if (c) campaigns.push({ dir, product: c.product, score: c.score || 0, status: c.status || 'draft', createdAt: c.createdAt || '' });
  }
  
  // Group by product, keep only LATEST per product
  const byProduct = {};
  for (const c of campaigns) {
    if (!byProduct[c.product]) byProduct[c.product] = [];
    byProduct[c.product].push(c);
  }
  
  const keep = [];
  const archive = [];
  
  for (const [product, items] of Object.entries(byProduct)) {
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    keep.push(items[0]); // Keep latest
    for (let i = 1; i < items.length; i++) archive.push(items[i]); // Archive rest
  }
  
  mkdirSync(ARCHIVE_DIR, { recursive: true });
  
  // Archive old campaigns
  for (const a of archive) {
    const src = join(CAMPAIGNS_DIR, a.dir);
    const dst = join(ARCHIVE_DIR, a.dir);
    try {
      cpSync(src, dst, { recursive: true });
      rmSync(src, { recursive: true, force: true });
      console.log(`📦 Archived: ${a.dir} (${a.product})`);
    } catch (e) {
      rmSync(src, { recursive: true, force: true });
      console.log(`🗑️ Deleted: ${a.dir} (${a.product})`);
    }
  }
  
  // Build clean index — only 1 per product
  const index = {
    updated: new Date().toISOString(),
    total: keep.length,
    campaigns: keep.map(k => ({
      id: k.dir,
      product: k.product,
      score: k.score,
      status: k.status || 'draft',
      channels: getCampaign(k.dir)?.channels || [],
      createdAt: k.createdAt
    }))
  };
  
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf8');
  
  console.log(`\n=== CAMPAIGN CLEANER ===`);
  console.log(`Total before: ${campaigns.length}`);
  console.log(`Kept: ${keep.length} (1 per product)`);
  console.log(`Archived: ${archive.length}`);
  console.log(`\nActive campaigns:`);
  keep.forEach(k => console.log(`  ${k.product}: ${k.dir.substring(0,25)}... (${k.score}/100, ${k.status})`));
  
  return { kept: keep, archived: archive.length };
}

clean();
