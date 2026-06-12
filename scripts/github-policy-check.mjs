#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const REPORT_PATH = path.resolve('ops/runtime/github-policy-report.json');

const RESOURCE_LIMITS = {
  actionsMinutes: { limit: 25000, unit: 'minutes/mes', warnAt: 0.8 },
  actionsStorage: { limit: 25, unit: 'GB', warnAt: 0.8 },
  actionsCustomImages: { limit: 75, unit: 'GiB', warnAt: 0.8 },
  gitLfsBandwidth: { limit: 125, unit: 'GB/mes', warnAt: 0.8 },
  gitLfsStorage: { limit: 125, unit: 'GB', warnAt: 0.8 },
  packagesTransfer: { limit: 50, unit: 'GB/mes', warnAt: 0.8 },
  packagesStorage: { limit: 25, unit: 'GB', warnAt: 0.8 },
  gfysCredits: { limit: 4982.40, unit: 'USD/mes', warnAt: 0.8 }
};

async function fetchGitHubAPI(endpoint) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const headers = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`https://api.github.com${endpoint}`, { headers, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getBillingUsage() {
  const owner = 'Tiggreee';
  const [actions, packages, sharedStorage] = await Promise.all([
    fetchGitHubAPI(`/orgs/${owner}/settings/billing/actions`),
    fetchGitHubAPI(`/orgs/${owner}/settings/billing/packages`),
    fetchGitHubAPI(`/orgs/${owner}/settings/billing/shared-storage`)
  ]);

  return {
    actionsMinutesUsed: actions?.total_minutes_used ?? 0,
    actionsMinutesPaid: actions?.total_paid_minutes_used ?? 0,
    actionsStorageUsed: actions?.included_storage_gb ? 0 : (sharedStorage?.storage_gb ?? 0),
    packagesStorageUsed: packages?.included_storage_gb ? 0 : (sharedStorage?.storage_gb ?? 0),
    gitLfsBandwidthUsed: 0,
    gitLfsStorageUsed: 0
  };
}

function generateReport(usage) {
  const alerts = [];
  const resources = {};

  for (const [key, cfg] of Object.entries(RESOURCE_LIMITS)) {
    const used = usage[`${key}Used`] ?? 0;
    const pct = cfg.limit > 0 ? used / cfg.limit : 0;
    resources[key] = { used, limit: cfg.limit, unit: cfg.unit, usagePct: Math.round(pct * 100) };

    if (pct >= cfg.warnAt) {
      alerts.push({
        resource: key,
        severity: pct >= 0.95 ? 'CRITICAL' : 'WARN',
        message: `${key} al ${Math.round(pct * 100)}% de capacidad (${used}/${cfg.limit} ${cfg.unit})`,
        action: pct >= 0.95 ? 'DETENER workflows no esenciales inmediatamente' : 'Revisar uso y optimizar'
      });
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    resources,
    alerts,
    policyChanges: [],
    summary: {
      status: alerts.length === 0 ? 'OK' : alerts.some(a => a.severity === 'CRITICAL') ? 'CRITICAL' : 'WARN',
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'CRITICAL').length,
      nextCheck: new Date(Date.now() + 7 * 86400000).toISOString()
    }
  };
}

async function main() {
  const usage = await getBillingUsage();
  const report = generateReport(usage);

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║        GITHUB POLICY MONITOR - REPORT         ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');

  for (const [key, r] of Object.entries(report.resources)) {
    const pct = r.usagePct;
    const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
    const color = pct >= 80 ? '⚠️ ' : pct >= 50 ? '⚡' : '✅';
    console.log(`  ${color} ${key.padEnd(22)} ${bar} ${pct}% (${r.used}/${r.limit} ${r.unit})`);
  }

  console.log('');
  if (report.alerts.length === 0) {
    console.log('  ✅ Todo dentro de límites. Sin alertas.');
  } else {
    console.log(`  ⚠️  ${report.alerts.length} alerta(s):`);
    report.alerts.forEach(a => console.log(`     ${a.severity === 'CRITICAL' ? '🚨' : '⚠️'} [${a.severity}] ${a.message}`));
  }
  console.log('');
  console.log(`  Reporte: ${REPORT_PATH}`);
  console.log('');
}

main().catch(err => {
  console.error('Policy check failed:', err.message);
  process.exit(1);
});
