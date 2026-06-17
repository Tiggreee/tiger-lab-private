#!/usr/bin/env node
/**
 * Campaign Approval Engine — engine/campaigns/approval-engine.mjs
 * NO PARCHES. Real flow: approve → social pack → publish → confirm → log.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

const CAMPAIGNS_DIR = resolve('ops/runtime/campaigns');
const INDEX_PATH = join(CAMPAIGNS_DIR, 'index.json');
const OUTBOX_DIR = resolve('ops/traffic/outbox');

function loadJSON(path, fallback = {}) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { return fallback; }
}

function saveJSON(path, data) {
  mkdirSync(resolve('ops/traffic/outbox'), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}

function approveCampaign(campaignId) {
  // 1. Read campaign
  const campaignDir = join(CAMPAIGNS_DIR, campaignId);
  const campaignFile = join(campaignDir, 'campaign.json');
  
  if (!existsSync(campaignFile)) {
    return { status: 'error', reason: 'Campaign not found: ' + campaignId };
  }
  
  const campaign = loadJSON(campaignFile);
  const product = campaign.product || 'Unknown';
  
  // 2. Update index — mark as approved
  const index = loadJSON(INDEX_PATH, { campaigns: [] });
  const entry = index.campaigns?.find(c => c.id === campaignId);
  if (!entry) {
    index.campaigns = index.campaigns || [];
    index.campaigns.unshift({
      id: campaignId,
      product,
      score: campaign.score || 90,
      status: 'approved',
      channels: campaign.channels || [],
      createdAt: campaign.createdAt || new Date().toISOString(),
      approvedAt: new Date().toISOString()
    });
  } else {
    entry.status = 'approved';
    entry.approvedAt = new Date().toISOString();
  }
  index.updated = new Date().toISOString();
  saveJSON(INDEX_PATH, index);
  
  // 3. Build social pack with real funnel URL
  const packName = `social-pack-${product.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-approved`;
  const packFile = join(OUTBOX_DIR, `${packName}.json`);
  
  const stripeUrl = `https://tiger-lab-private-production.up.railway.app/api/checkout?product=${encodeURIComponent(product.toLowerCase().replace(/\s+/g, '-'))}&plan=starter&provider=stripe`;
  const paypalUrl = `https://tiger-lab-private-production.up.railway.app/api/checkout?product=${encodeURIComponent(product.toLowerCase().replace(/\s+/g, '-'))}&plan=starter&provider=paypal`;
  const funnelUrl = `https://tiger-lab-private-production.up.railway.app/checkout?product=${encodeURIComponent(product.toLowerCase().replace(/\s+/g, '-'))}`;
  
  const pack = {
    campaign: packName,
    generatedAt: new Date().toISOString(),
    approved: true,
    product,
    campaignId,
    payments: {
      stripe: stripeUrl,
      paypal: paypalUrl
    },
    funnel: {
      trafficDestination: funnelUrl,
      closeChannel: 'landing',
      closeDestination: funnelUrl,
      closeLink: funnelUrl
    },
    channels: {}
  };
  
  // Read actual campaign content files
  const channelExts = { email: 'html', linkedin: 'txt', x: 'txt', facebook: 'txt', telegram: 'md', discord: 'md' };
  for (const [ch, ext] of Object.entries(channelExts)) {
    const contentFile = join(campaignDir, `${ch}.${ext}`);
    if (existsSync(contentFile)) {
      pack.channels[ch] = { copyPaste: readFileSync(contentFile, 'utf8') };
    }
  }
  
  saveJSON(packFile, pack);
  
  // 4. Trigger publish via GitHub Actions
  let publishResult = 'not_triggered';
  try {
    execSync(`gh workflow run social-publish.yml --field campaign="${packName}" --field dry_run=false --field channels="linkedin,x,facebook,telegram,discord"`, {
      cwd: process.cwd(),
      stdio: 'pipe',
      timeout: 10000
    });
    publishResult = 'triggered';
  } catch (e) {
    publishResult = 'gh_cli_error: ' + (e.message?.substring(0, 80) || 'unknown');
  }
  
  // 5. Log to event DB
  try {
    execSync(`node engine/runtime/event-logger.mjs --backfill`, {
      cwd: process.cwd(),
      stdio: 'pipe',
      timeout: 10000
    });
  } catch {}
  
  return {
    status: 'approved',
    campaignId,
    product,
    packFile,
    funnelUrl,
    channels: Object.keys(pack.channels).length,
    publishTriggered: publishResult === 'triggered',
    publishResult,
    approvedAt: new Date().toISOString()
  };
}

function main() {
  const args = process.argv.slice(2);
  const id = args.includes('--campaign') ? args[args.indexOf('--campaign') + 1] : args[0];
  
  if (!id) {
    console.error('Usage: node approval-engine.mjs <campaign-id>');
    console.error('       node approval-engine.mjs --campaign <id>');
    process.exit(1);
  }
  
  const result = approveCampaign(id);
  
  if (result.status === 'error') {
    console.error('❌', result.reason);
    process.exit(1);
  }
  
  console.log('=== CAMPAIGN APPROVED ===');
  console.log(`✅ Campaign: ${result.campaignId}`);
  console.log(`📦 Product: ${result.product}`);
  console.log(`📂 Pack: ${result.packFile}`);
  console.log(`🔗 Funnel: ${result.funnelUrl}`);
  console.log(`📢 Channels: ${result.channels}`);
  console.log(`🚀 Publish: ${result.publishTriggered ? 'TRIGGERED' : result.publishResult}`);
  console.log(`⏰ Approved at: ${result.approvedAt}`);
}

main();
