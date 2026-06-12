#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DASHBOARD_PATH = path.resolve('ops/runtime/dashboard-unified.json');
const HISTORY_PATH = path.resolve('ops/runtime/failures-history.json');
const MAX_FAILURES = 100;

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 30000 }).trim();
  } catch (e) { return null; }
}

function runGh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 30000 }).trim();
  } catch (e) { return null; }
}

async function main() {
  console.log(`\n=== FAILURES MONITOR AGENT ===`);

  const history = loadJSON(HISTORY_PATH) || { snapshots: [], fixesApplied: [] };

  // 1. Fetch recent failed runs
  const failedJson = runGh(`gh run list --limit ${MAX_FAILURES} --json name,conclusion,status,createdAt,databaseId,url,headBranch,workflowDatabaseId,displayTitle --repo Tiggreee/tiger-lab-private 2>&1`);
  if (!failedJson) { console.error('Cannot fetch runs'); process.exit(1); }

  const runs = JSON.parse(failedJson);
  const failed = runs.filter(r => r.conclusion === 'startup_failure' || r.conclusion === 'failure' || r.status === 'failure');
  const successful = runs.filter(r => r.conclusion === 'success');

  // 3. Analyze failures
  const byType = {};
  const byWorkflow = {};
  for (const r of failed) {
    byType[r.conclusion] = (byType[r.conclusion] || 0) + 1;
    byWorkflow[r.name] = (byWorkflow[r.name] || 0) + 1;
  }

  console.log(`\nRuns analyzed: ${runs.length} total, ${failed.length} failed, ${successful.length} successful`);
  console.log(`\nFailures by type:`);
  for (const [type, count] of Object.entries(byType)) console.log(`  ${type}: ${count}`);
  console.log(`\nFailures by workflow:`);
  for (const [name, count] of Object.entries(byWorkflow)) console.log(`  ${name}: ${count}`);

  // 4. Determine root cause
  const rootCauses = [];
  if (perm === 'local_only') {
    rootCauses.push({ cause: 'allowed_actions: local_only blocks marketplace actions', severity: 'critical', fix: 'Set allowed_actions to "all" in repo settings or via GitHub API' });
  }
  if (failed.length > 0 && failed[0].conclusion === 'startup_failure') {
    rootCauses.push({ cause: 'Workflow failed to boot — likely uses marketplace actions not in allowed list', severity: 'critical', fix: 'Change to allowed_actions: all or rewrite workflows without external actions' });
  }
  if (rootCauses.length === 0 && failed.length > 0) {
    rootCauses.push({ cause: 'Check failures in workflow steps', severity: 'high', fix: 'Review logs for each failed run' });
  }
  if (failed.length === 0) {
    rootCauses.push({ cause: 'No failures detected', severity: 'info', fix: 'All clear' });
  }

  // 5. Check if actions permission was already fixed (changed from local_only)
  const permChanged = history.lastKnownPermission === 'local_only' && perm === 'all';
  if (permChanged) {
    rootCauses.unshift({ cause: 'FIXED: allowed_actions changed from local_only to all', severity: 'fixed', fix: 'Marketplace actions now allowed. Re-running workflows...' });
    // Queue re-runs
    console.log(`\n=== RE-RUNNING FAILED WORKFLOWS ===`);
    const reRunIds = failed.slice(0, 10).map(r => r.databaseId);
    for (const id of reRunIds) {
      const result = runGh(`gh run rerun ${id} --repo Tiggreee/tiger-lab-private 2>&1`);
      console.log(`  Re-ran ${id}: ${result ? 'OK' : 'FAILED'}`);
    }
    history.reran = [...(history.reran || []), ...reRunIds];
  }

  // 6. Save history snapshot
  history.snapshots.push({
    timestamp: new Date().toISOString(),
    totalRuns: runs.length,
    failed: failed.length,
    successful: successful.length,
    byType,
    byWorkflow,
    perm
  });
  if (history.snapshots.length > 100) history.snapshots = history.snapshots.slice(-100);
  history.lastKnownPermission = perm;
  history.lastAnalysis = new Date().toISOString();
  history.totalFailuresTracked = (history.totalFailuresTracked || 0) + failed.length;

  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));

  // 7. Update dashboard
  const dash = loadJSON(DASHBOARD_PATH) || {};
  dash.failuresMonitor = {
    lastAnalysis: history.lastAnalysis,
    totalRuns: runs.length,
    failedToday: failed.length,
    successfulToday: successful.length,
    byType,
    byWorkflow: Object.entries(byWorkflow).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => ({ workflow: k, failures: v })),
    rootCauses,
    permFixed: permChanged,
    currentPermission: perm
  };
  fs.writeFileSync(DASHBOARD_PATH, JSON.stringify(dash, null, 2));

  // 8. Print report
  console.log(`\n=== FAILURES REPORT ===`);
  for (const rc of rootCauses) console.log(`  [${rc.severity.toUpperCase()}] ${rc.cause}`);
  console.log(`\nTotal failures tracked all time: ${history.totalFailuresTracked}`);
  console.log(`Permission: ${perm} (was: ${history.lastKnownPermission || 'unknown'})`);
  console.log(`Re-runs triggered: ${history.reran?.length || 0}`);
  console.log(`Dashboard updated.\n`);
}

function loadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

main().catch(err => { console.error(`FATAL: ${err.message}`); process.exit(1); });
