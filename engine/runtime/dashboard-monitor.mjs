#!/usr/bin/env node
/**
 * Dashboard Monitor — engine/runtime/dashboard-monitor.mjs
 * Mini AI bot. Reviews dashboard every 15 min. Reports issues.
 * Small, lightweight, portable. Zero GitHub deps.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DASH_PATH = resolve('ops/runtime/dashboard-unified.json');
const ALERTS_PATH = resolve('ops/runtime/dashboard-alerts.json');
const INTERVAL_MS = 15 * 60 * 1000;

function loadJSON(p) {
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch { return null; }
}

function checkDashboard(data) {
  const alerts = [];
  
  if (!data) return [{ level: 'CRITICAL', msg: 'Dashboard file missing or corrupt' }];

  // Gate check
  const gate = data.systemStatus?.gate || 'UNKNOWN';
  if (gate !== 'GO') alerts.push({ level: 'WARN', msg: `Gate: ${gate}` });

  // Lead engine
  const leads = data.leadEngine?.stats?.companies || 0;
  if (leads < 100) alerts.push({ level: 'WARN', msg: `Leads: ${leads} (< 100)` });
  if (leads === 0) alerts.push({ level: 'CRITICAL', msg: 'No leads in DB' });

  // Product scores
  const products = data.productEngine?.scores || [];
  const avgScore = products.length ? Math.round(products.reduce((s, p) => s + (p.score || 0), 0) / products.length) : 0;
  if (avgScore < 70) alerts.push({ level: 'WARN', msg: `Product avg ${avgScore} < 70` });
  if (avgScore < 50) alerts.push({ level: 'CRITICAL', msg: `Product avg ${avgScore} < 50` });

  // Agent monitor
  const agents = data.agentMonitor?.agents || [];
  const inactiveAgents = agents.filter(a => a.status !== 'active');
  if (inactiveAgents.length > 0) {
    alerts.push({ level: 'WARN', msg: `${inactiveAgents.length} inactive agents` });
  }

  // Monetization
  const monetization = data.monetization || {};
  if (!monetization.leadsToday) alerts.push({ level: 'INFO', msg: 'No leads generated today' });
  
  // Failures
  const failures = data.failuresMonitor || {};
  if (failures.failedToday > 3) alerts.push({ level: 'WARN', msg: `${failures.failedToday} failures today` });

  // Implementation
  const impl = data.implementationTracker?.summary?.implementationPercent || 0;
  if (impl < 80) alerts.push({ level: 'WARN', msg: `Implementation ${impl}% < 80%` });

  // KPI health
  const kpis = data.kpis || {};
  if (kpis.campaignsToday === 0 && kpis.contentGenerated === 0) {
    alerts.push({ level: 'INFO', msg: 'No campaigns or content generated today' });
  }

  if (alerts.length === 0) {
    alerts.push({ level: 'OK', msg: 'All systems nominal' });
  }

  return alerts;
}

function generateReport(alerts, data) {
  const criticals = alerts.filter(a => a.level === 'CRITICAL');
  const warnings = alerts.filter(a => a.level === 'WARN');
  const infos = alerts.filter(a => a.level === 'INFO');
  const oks = alerts.filter(a => a.level === 'OK');

  return {
    checkedAt: new Date().toISOString(),
    status: criticals.length > 0 ? 'DEGRADED' : warnings.length > 0 ? 'WARNING' : 'HEALTHY',
    summary: {
      critical: criticals.length,
      warnings: warnings.length,
      info: infos.length,
      ok: oks.length
    },
    alerts,
    snapshot: {
      gate: data?.systemStatus?.gate || 'UNKNOWN',
      leads: data?.leadEngine?.stats?.companies || 0,
      agents: data?.agentMonitor?.agents?.length || 0,
      products: data?.productEngine?.scores?.length || 0,
      productAvg: Math.round((data?.productEngine?.scores || []).reduce((s, p) => s + (p.score || 0), 0) / (data?.productEngine?.scores?.length || 1)),
      implementation: data?.implementationTracker?.summary?.implementationPercent || 0,
      failuresToday: data?.failuresMonitor?.failedToday || 0
    }
  };
}

function run() {
  const data = loadJSON(DASH_PATH);
  const alerts = checkDashboard(data);
  const report = generateReport(alerts, data);

  mkdirSync(resolve('ops/runtime'), { recursive: true });
  writeFileSync(ALERTS_PATH, JSON.stringify(report, null, 2), 'utf8');

  const emoji = report.status === 'HEALTHY' ? '✅' : report.status === 'WARNING' ? '⚠️' : '🔴';
  console.log(`${emoji} Dashboard Monitor — ${report.status}`);
  console.log(`   Critical: ${report.summary.critical} | Warnings: ${report.summary.warnings} | Info: ${report.summary.info}`);
  console.log(`   Gate: ${report.snapshot.gate} | Leads: ${report.snapshot.leads} | Agents: ${report.snapshot.agents}`);
  console.log(`   Product Avg: ${report.snapshot.productAvg} | Impl: ${report.snapshot.implementation}% | Failures: ${report.snapshot.failuresToday}`);
  console.log(`   Report: ${ALERTS_PATH}`);

  return report;
}

// Continuous mode
if (process.argv.includes('--watch')) {
  console.log(`🔍 Dashboard Monitor watching every ${INTERVAL_MS / 1000 / 60}min...`);
  run();
  setInterval(run, INTERVAL_MS);
} else {
  run();
}
