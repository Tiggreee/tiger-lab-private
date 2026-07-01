#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLISHED_DIR = path.resolve(ROOT, 'ops/campaigns/50-published');
const INDEX_PATH = path.resolve(ROOT, 'ops/runtime/campaigns/index.json');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function collectPublishedCampaignIds() {
  if (!fs.existsSync(PUBLISHED_DIR)) {
    return [];
  }

  return fs
    .readdirSync(PUBLISHED_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => {
      const payload = loadJson(path.join(PUBLISHED_DIR, entry.name));
      return String(payload.campaignId || '').trim();
    })
    .filter(Boolean)
    .sort();
}

function collectIndexedCampaignIds() {
  if (!fs.existsSync(INDEX_PATH)) {
    return [];
  }

  const index = loadJson(INDEX_PATH);
  const campaigns = Array.isArray(index.campaigns) ? index.campaigns : [];
  return campaigns.map((entry) => String(entry.id || '').trim()).filter(Boolean).sort();
}

function arrayDiff(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

function main() {
  const publishedIds = collectPublishedCampaignIds();
  const indexedIds = collectIndexedCampaignIds();

  const missingInIndex = arrayDiff(publishedIds, indexedIds);
  const missingInPublished = arrayDiff(indexedIds, publishedIds);

  if (missingInIndex.length === 0 && missingInPublished.length === 0) {
    process.stdout.write('Campaign index alignment: OK\n');
    process.stdout.write(`Published=${publishedIds.length} Indexed=${indexedIds.length}\n`);
    return;
  }

  process.stderr.write('Campaign index alignment: FAIL\n');
  if (missingInIndex.length > 0) {
    process.stderr.write(`Missing in index: ${missingInIndex.join(', ')}\n`);
  }
  if (missingInPublished.length > 0) {
    process.stderr.write(`Missing in 50-published: ${missingInPublished.join(', ')}\n`);
  }

  process.exit(1);
}

main();