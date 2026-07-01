#!/usr/bin/env node
/**
 * Dashboard Monitor v2 — engine/runtime/dashboard-monitor.mjs
 * Revenue-aware AI bot. Trends, predictions, recommendations. 
 * Double functionality: alerts + intelligence.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const DASH_PATH = resolve('ops/runtime/dashboard-unified.json');
const ALERTS_PATH = resolve('ops/runtime/dashboard-alerts.json');
const BILLING_PATH = resolve('ops/runtime/billing-reconciliation-report.json');
const GATE_PATH = resolve('ops/runtime/production-go-no-go-report.json');
const INTERVAL_MS = 15 * 60 * 1000;

let previousSnapshot = null;

function loadJSON(p) {
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch { return null; }
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function computeDelta(current, previous) {
  if (current === null || previous === null) return null;
  return current - previous;
}

function formatMetric(value, fallback = 'UNKNOWN') {
  return value === null ? fallback : String(value);
}

function normalizeBillingStatus(value) {
  const normalized = String(value || 'unknown').trim().toUpperCase();
  if (normalized === 'OK' || normalized === 'MATCH') return 'MATCH';
  if (normalized === 'MISMATCH') return 'MISMATCH';
  return 'UNKNOWN';
}

function deriveGateStatus(gateReport, billingStatus) {
  if (billingStatus !== 'MATCH') {
    return billingStatus === 'MISMATCH' ? 'NO_GO' : 'UNKNOWN';
  }
  const gate = String(gateReport?.gateStatus || 'UNKNOWN').trim().toUpperCase();
  if (gate === 'GO' || gate === 'GO_WITH_WARNINGS' || gate === 'NO_GO') {
    return gate;
  }
  return 'UNKNOWN';
}

function analyze(data, prev) {
  const now = new Date().toISOString();
  const billingReport = loadJSON(BILLING_PATH);
  const gateReport = loadJSON(GATE_PATH);
  const billingStatus = normalizeBillingStatus(billingReport?.status);
  const gate = deriveGateStatus(gateReport, billingStatus);
  const leads = parseNumber(data?.monetization?.leadsToday);
  const agents = parseNumber(data?.agentMonitor?.summary?.activeAgents);
  const products = data?.products?.items || [];
  const avgScore = null;
  const failures = parseNumber(data?.failuresMonitor?.failedToday);
  const revenue = parseNumber(data?.monetization?.averagePrice);
  const campaigns = parseNumber(data?.campaigns?.total);

  // Trends (vs previous check)
  const leadTrend = computeDelta(leads, prev?.leads ?? null);
  const revenueTrend = computeDelta(revenue, prev?.revenue ?? null);
  const campaignTrend = computeDelta(campaigns, prev?.campaigns ?? null);
  const scoreTrend = computeDelta(avgScore, prev?.productAvg ?? null);

  // Alerts
  const alerts = [];
  if (gate !== 'GO') alerts.push({ type:'gate', msg:`Gate: ${gate}`, level:'warn' });
  if (billingStatus !== 'MATCH') alerts.push({ type:'billing', msg:`Billing reconciliation: ${billingStatus}`, level:'warn' });
  if (leads !== null && leads < 500) alerts.push({ type:'leads', msg:`Leads: ${leads} (<500 target)`, level:'warn' });
  if (failures !== null && failures > 5) alerts.push({ type:'failures', msg:`${failures} failures`, level:'warn' });
  if (avgScore !== null && avgScore < 70) alerts.push({ type:'products', msg:`Avg score ${avgScore}/100`, level:'info' });

  const revenueMsg = revenue === null
    ? 'Revenue: UNKNOWN (no evidence in runtime source).'
    : `Revenue observed: ${revenue}.`;

  // Recommendations
  const recommendations = [];
  if (billingStatus !== 'MATCH') recommendations.push({ action:'billing', detail:'Resolver mismatch fiscal antes de cualquier release comercial.' });
  if (leads === null) recommendations.push({ action:'data', detail:'Publicar evidencia real de leads para sustituir UNKNOWN.' });
  if (campaigns === null) recommendations.push({ action:'data', detail:'Publicar evidencia real de campañas para sustituir UNKNOWN.' });

  // Health score (0-100)
  let health = 100;
  if (gate !== 'GO') health -= 35;
  if (billingStatus !== 'MATCH') health -= 35;
  if (leads === null) health -= 10;
  if (campaigns === null) health -= 10;
  if (failures !== null && failures > 10) health -= 10;
  health = Math.max(0, Math.min(100, health));

  return {
    checkedAt: now,
    status: health >= 80 ? 'HEALTHY' : health >= 50 ? 'MONITORING' : 'ATTENTION',
    health,
    gate,
    billingStatus,
    snapshot: { leads, agents, products: products.length, productAvg: avgScore, revenue, campaigns, failures },
    trends: { leads: leadTrend, revenue: revenueTrend, campaigns: campaignTrend, scores: scoreTrend },
    alerts: alerts.length ? alerts : [{ type:'ok', msg:'All systems green.', level:'ok' }],
    revenueIntelligence: revenueMsg,
    predictions: [],
    recommendations
  };
}

function run() {
  const data = loadJSON(DASH_PATH);
  const report = analyze(data, previousSnapshot);
  previousSnapshot = report.snapshot;
  
  mkdirSync(resolve('ops/runtime'), { recursive: true });
  writeFileSync(ALERTS_PATH, JSON.stringify(report, null, 2), 'utf8');
  
  const icon = report.status === 'HEALTHY' ? '🟢' : report.status === 'MONITORING' ? '🟡' : '🔴';
  console.log(`${icon} Health: ${report.health}/100 — ${report.status}`);
  console.log(`   Gate: ${report.gate} | Billing: ${report.billingStatus} | Leads: ${formatMetric(report.snapshot.leads)}`);
  console.log(`   Trends: leads ${formatMetric(report.trends.leads)} | campaigns ${formatMetric(report.trends.campaigns)}`);
  console.log(`   ${report.revenueIntelligence}`);
  console.log(`   Recommendations: ${report.recommendations.length}`);
  console.log(`   Alerts: ${report.alerts.filter(a=>a.level!=='ok').length}`);
  
  return report;
}

if (process.argv.includes('--watch')) {
  console.log(`🤖 Dashboard Monitor v2 watching every ${INTERVAL_MS/60000}min...`);
  run();
  setInterval(run, INTERVAL_MS);
} else {
  run();
}
