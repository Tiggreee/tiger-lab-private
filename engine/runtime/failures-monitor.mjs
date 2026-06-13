/**
 * Failures Monitor — engine/runtime/failures-monitor.mjs
 * Pure business logic: failure classification, root cause analysis,
 * history tracking, dashboard updates. Zero GitHub dependencies.
 */

export function analyzeFailures({ runs }) {
  const failed = runs.filter(r =>
    r.conclusion === 'startup_failure' || r.conclusion === 'failure' || r.status === 'failure');
  const successful = runs.filter(r => r.conclusion === 'success');

  const byType = {};
  const byWorkflow = {};
  for (const r of failed) {
    byType[r.conclusion] = (byType[r.conclusion] || 0) + 1;
    byWorkflow[r.name] = (byWorkflow[r.name] || 0) + 1;
  }

  const rootCauses = [];
  if (failed.length > 0 && failed[0].conclusion === 'startup_failure') {
    rootCauses.push({
      cause: 'Workflow failed to boot — likely uses marketplace actions not in allowed list',
      severity: 'critical',
      fix: 'Change to allowed_actions: all or rewrite workflows without external actions'
    });
  }
  if (rootCauses.length === 0 && failed.length > 0) {
    rootCauses.push({
      cause: 'Check failures in workflow steps',
      severity: 'high',
      fix: 'Review logs for each failed run'
    });
  }
  if (failed.length === 0) {
    rootCauses.push({ cause: 'No failures detected', severity: 'info', fix: 'All clear' });
  }

  return {
    runs: { total: runs.length, failed: failed.length, successful: successful.length },
    byType,
    byWorkflow,
    rootCauses,
    failedRuns: failed,
  };
}

export function buildHistorySnapshot(history, analysis, perm) {
  history.snapshots = history.snapshots || [];
  history.snapshots.push({
    timestamp: new Date().toISOString(),
    totalRuns: analysis.runs.total,
    failed: analysis.runs.failed,
    successful: analysis.runs.successful,
    byType: analysis.byType,
    byWorkflow: analysis.byWorkflow,
    perm
  });
  if (history.snapshots.length > 100) history.snapshots = history.snapshots.slice(-100);
  history.lastKnownPermission = perm;
  history.lastAnalysis = new Date().toISOString();
  history.totalFailuresTracked = (history.totalFailuresTracked || 0) + analysis.runs.failed;
  return history;
}

export function buildDashboardUpdate(dash, analysis, perm, permChanged) {
  dash.failuresMonitor = {
    lastAnalysis: new Date().toISOString(),
    totalRuns: analysis.runs.total,
    failedToday: analysis.runs.failed,
    successfulToday: analysis.runs.successful,
    byType: analysis.byType,
    byWorkflow: Object.entries(analysis.byWorkflow)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k, v]) => ({ workflow: k, failures: v })),
    rootCauses: analysis.rootCauses,
    permFixed: permChanged,
    currentPermission: perm
  };
  return dash;
}

export function checkPermissionChange(history, currentPerm) {
  return history.lastKnownPermission === 'local_only' && currentPerm === 'all';
}

export function formatReport(analysis, history, perm, permChanged) {
  const lines = [];
  lines.push(`\n=== FAILURES MONITOR AGENT ===`);
  lines.push(`\nRuns analyzed: ${analysis.runs.total} total, ${analysis.runs.failed} failed, ${analysis.runs.successful} successful`);
  lines.push(`\nFailures by type:`);
  for (const [type, count] of Object.entries(analysis.byType)) lines.push(`  ${type}: ${count}`);
  lines.push(`\nFailures by workflow:`);
  for (const [name, count] of Object.entries(analysis.byWorkflow)) lines.push(`  ${name}: ${count}`);

  if (permChanged) {
    lines.push(`\n=== RE-RUNNING FAILED WORKFLOWS ===`);
    for (const id of (history.reran || []).slice(-10)) lines.push(`  Re-ran ${id}`);
  }

  lines.push(`\n=== FAILURES REPORT ===`);
  for (const rc of analysis.rootCauses) lines.push(`  [${rc.severity.toUpperCase()}] ${rc.cause}`);
  lines.push(`\nTotal failures tracked all time: ${history.totalFailuresTracked || 0}`);
  lines.push(`Permission: ${perm} (was: ${history.lastKnownPermission || 'unknown'})`);
  lines.push(`Re-runs triggered: ${history.reran?.length || 0}`);
  lines.push(`Dashboard updated.\n`);
  return lines.join('\n');
}
