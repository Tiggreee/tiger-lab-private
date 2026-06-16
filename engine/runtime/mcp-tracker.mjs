#!/usr/bin/env node
/**
 * MCP Activity Tracker — engine/runtime/mcp-tracker.mjs
 * Tracks which MCP servers are used, how often, scores them.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const REGISTRY_PATH = resolve('ops/mcp/external-registry.json');
const ACTIVITY_PATH = resolve('ops/runtime/mcp-activity.json');

function loadRegistry() {
  return JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
}

function loadActivity() {
  try { return JSON.parse(readFileSync(ACTIVITY_PATH, 'utf8')); }
  catch { return { tracked: {}, history: [] }; }
}

function scoreServer(server, activity) {
  const usage = activity?.uses || 0;
  const enabled = server.enabled ? 30 : 0;
  const impactScore = server.impact === 'high' ? 40 : server.impact === 'medium' ? 25 : 10;
  const usageScore = Math.min(30, usage * 3);
  return Math.min(100, enabled + impactScore + usageScore);
}

function track(serverId, action) {
  const registry = loadRegistry();
  const activity = loadActivity();
  
  if (!activity.tracked[serverId]) {
    activity.tracked[serverId] = { uses: 0, enabled: false, lastUsed: null, firstSeen: new Date().toISOString() };
  }
  
  if (action === 'enable') activity.tracked[serverId].enabled = true;
  if (action === 'disable') activity.tracked[serverId].enabled = false;
  if (action === 'use') {
    activity.tracked[serverId].uses++;
    activity.tracked[serverId].lastUsed = new Date().toISOString();
  }
  
  activity.history.push({
    time: new Date().toISOString(),
    server: serverId,
    action
  });
  
  if (activity.history.length > 1000) activity.history = activity.history.slice(-500);
  
  mkdirSync(resolve('ops/runtime'), { recursive: true });
  writeFileSync(ACTIVITY_PATH, JSON.stringify(activity, null, 2), 'utf8');
  
  return activity;
}

function generateReport() {
  const registry = loadRegistry();
  const activity = loadActivity();
  const servers = Object.values(registry.servers);
  
  const scored = servers.map(s => {
    const acts = activity.tracked[s.id] || { uses: 0, enabled: false };
    const score = scoreServer(s, acts);
    return {
      id: s.id,
      name: s.name,
      category: s.category,
      enabled: s.enabled,
      uses: acts.uses || 0,
      lastUsed: acts.lastUsed,
      impact: s.impact,
      score,
      rank: 0
    };
  }).sort((a, b) => b.score - a.score);
  
  scored.forEach((s, i) => s.rank = i + 1);
  
  const report = {
    generatedAt: new Date().toISOString(),
    total: scored.length,
    active: scored.filter(s => s.enabled).length,
    totalUses: scored.reduce((sum, s) => sum + s.uses, 0),
    topServer: scored[0]?.name || 'None',
    servers: scored
  };
  
  writeFileSync(ACTIVITY_PATH, JSON.stringify({ ...activity, report }, null, 2), 'utf8');
  
  console.log('=== MCP ACTIVITY TRACKER ===');
  console.log(`Active: ${report.active}/${report.total}`);
  console.log(`Total uses: ${report.totalUses}`);
  console.log(`Top: ${report.topServer} (${scored[0]?.score}/100)`);
  console.log(`\n📄 Report: ${ACTIVITY_PATH}`);
  
  return report;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--track')) {
    const id = args[args.indexOf('--track') + 1];
    const action = args.includes('--enable') ? 'enable' : args.includes('--disable') ? 'disable' : 'use';
    track(id, action);
    console.log(`Tracked: ${id} → ${action}`);
  } else {
    generateReport();
  }
}

main();
