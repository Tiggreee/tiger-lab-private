#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeFailures, buildHistorySnapshot, buildDashboardUpdate, checkPermissionChange, formatReport } from '../engine/runtime/failures-monitor.mjs';

const DP = path.resolve('ops/runtime/dashboard-unified.json');
const HP = path.resolve('ops/runtime/failures-history.json');
const MAX = 100;

function load(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function gh(cmd) { try { return execSync(cmd, { encoding: 'utf8', timeout: 30000 }).trim(); } catch { return null; } }

async function main() {
  const history = load(HP) || { snapshots: [], fixesApplied: [] };
  const perm = 'all';
  const raw = gh(`gh run list --limit ${MAX} --json name,conclusion,status,createdAt,databaseId,url,headBranch,workflowDatabaseId,displayTitle --repo Tiggreee/tiger-lab-private 2>&1`);
  if (!raw) { console.error('Cannot fetch runs'); process.exit(1); }

  const analysis = analyzeFailures({ runs: JSON.parse(raw) });
  const permChanged = checkPermissionChange(history, perm);

  if (permChanged) {
    const ids = analysis.failedRuns.slice(0, 10).map(r => r.databaseId);
    for (const id of ids) gh(`gh run rerun ${id} --repo Tiggreee/tiger-lab-private 2>&1`);
    history.reran = [...(history.reran || []), ...ids];
  }

  const updatedHistory = buildHistorySnapshot(history, analysis, perm);
  const dash = load(DP) || {};
  const updatedDash = buildDashboardUpdate(dash, analysis, perm, permChanged);

  fs.writeFileSync(HP, JSON.stringify(updatedHistory, null, 2));
  fs.writeFileSync(DP, JSON.stringify(updatedDash, null, 2));
  console.log(formatReport(analysis, updatedHistory, perm, permChanged));
}

main().catch(err => { console.error(`FATAL: ${err.message}`); process.exit(1); });
