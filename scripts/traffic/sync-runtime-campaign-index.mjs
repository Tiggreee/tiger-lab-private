#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const PUBLISHED_DIR = path.resolve(ROOT, 'ops/campaigns/50-published');
const RUNTIME_CAMPAIGNS_DIR = path.resolve(ROOT, 'ops/runtime/campaigns');
const INDEX_PATH = path.join(RUNTIME_CAMPAIGNS_DIR, 'index.json');
const INDEX_LOCK_PATH = path.join(RUNTIME_CAMPAIGNS_DIR, '.index-sync.lock');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listPublishedFiles() {
  if (!fs.existsSync(PUBLISHED_DIR)) {
    return [];
  }

  return fs
    .readdirSync(PUBLISHED_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(PUBLISHED_DIR, entry.name));
}

function buildEntry(publishedPayload) {
  const campaignId = String(publishedPayload.campaignId || '').trim();
  if (!campaignId) {
    throw new Error('Published payload missing campaignId.');
  }

  const campaignDir = path.join(RUNTIME_CAMPAIGNS_DIR, campaignId);
  const campaignFile = path.join(campaignDir, 'campaign.json');
  const runtimeCampaign = fs.existsSync(campaignFile) ? loadJson(campaignFile) : {};

  const quality = publishedPayload.qualityResult || {};
  const channels = Array.isArray(runtimeCampaign.channels) ? runtimeCampaign.channels : [];
  const primaryChannel = channels.length > 0 ? String(channels[0]) : 'unknown';
  const score = Number.isFinite(Number(runtimeCampaign.score))
    ? Number(runtimeCampaign.score)
    : Number.isFinite(Number(quality.averageSpecificity))
      ? Number(quality.averageSpecificity)
      : 0;

  const publishedAt = String(
    runtimeCampaign.publishedAt ||
    publishedPayload.publishedAt ||
    publishedPayload.finalizedAt ||
    new Date().toISOString()
  );

  return {
    id: campaignId,
    product: String(runtimeCampaign.product || publishedPayload?.brief?.productName || 'Unknown Product'),
    score: Math.max(0, Math.round(score)),
    status: 'published',
    channel: primaryChannel,
    channels,
    createdAt: String(runtimeCampaign.createdAt || publishedPayload.finalizedAt || new Date().toISOString()),
    approvedAt: String(publishedPayload.finalizedAt || new Date().toISOString()),
    publishedAt
  };
}

function acquireIndexLock() {
  try {
    const fd = fs.openSync(INDEX_LOCK_PATH, 'wx');
    fs.writeFileSync(fd, `${process.pid}\n`, 'utf8');
    return fd;
  } catch (error) {
    if (error && error.code === 'EEXIST') {
      throw new Error('Runtime index lock exists. Another sync is in progress.');
    }
    throw error;
  }
}

function releaseIndexLock(fd) {
  try {
    if (typeof fd === 'number') {
      fs.closeSync(fd);
    }
  } catch {
    // Best effort close.
  }

  try {
    fs.rmSync(INDEX_LOCK_PATH, { force: true });
  } catch {
    // Best effort cleanup.
  }
}

export function syncRuntimeCampaignIndex() {
  const lockFd = acquireIndexLock();
  const publishedFiles = listPublishedFiles();
  const entries = [];

  try {
    for (const filePath of publishedFiles) {
      const payload = loadJson(filePath);
      entries.push(buildEntry(payload));
    }

    entries.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

    const index = {
      updated: new Date().toISOString(),
      total: entries.length,
      campaigns: entries
    };

    fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true });
    fs.writeFileSync(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`, 'utf8');

    return index;
  } finally {
    releaseIndexLock(lockFd);
  }
}

function main() {
  const index = syncRuntimeCampaignIndex();
  process.stdout.write(`Synced runtime campaign index. campaigns=${index.total}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(THIS_FILE)) {
  main();
}