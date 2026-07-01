import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OPS = join(ROOT, 'ops');
const RUNTIME = join(OPS, 'runtime');
const OUTBOX = join(OPS, 'traffic', 'outbox');
const CATALOG = join(OPS, 'catalog', 'products.json');
const LANDINGS = join(OPS, 'landings', 'index.json');
const TASKS = join(OPS, 'command-center', 'tasks.json');
const AGENT_MONITOR = join(RUNTIME, 'agent-monitor.json');
const BILLING_RECONCILIATION = join(RUNTIME, 'billing-reconciliation-report.json');
const PRODUCTION_GATE = join(RUNTIME, 'production-go-no-go-report.json');
const BOTS_DIR = join(ROOT, 'bots');
const FINISHED_PRODUCTS_DIR = join(ROOT, 'products', 'finished');
const OUTPUT = join(RUNTIME, 'dashboard-unified.json');

function readJSON(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, 'utf-8')); }
  catch { return fallback; }
}

function gatherCampaigns() {
  if (!existsSync(OUTBOX)) return { total: 0, recent: [] };
  const files = readdirSync(OUTBOX)
    .filter(f => f.endsWith('.json') && f.startsWith('social-pack-'))
    .sort()
    .reverse()
    .slice(0, 10);
  const campaigns = files.map(f => {
    const data = readJSON(join(OUTBOX, f));
    if (!data) return null;
    return {
      file: f,
      name: data.campaign || f.replace(/\.json$/, ''),
      topic: data.topic || 'N/A',
      avgScore: data.quality?.averageScore || data.quality?.avgQualityScore || 0,
      projectedLift: data.quality?.projectedAverageLiftPct || data.quality?.avgLiftPct || 0,
      targetReached: data.quality?.targetReached || false,
      mcpDecision: data.mcpAudit?.decision || 'unknown',
      channels: Object.keys(data.channels || {}),
      generatedAt: data.generatedAt || data.meta?.generatedAt || null
    };
  }).filter(Boolean);
  return { total: files.length, recent: campaigns };
}

function extractGateCheck(gateReport, checkId) {
  const checks = Array.isArray(gateReport?.checks) ? gateReport.checks : [];
  return checks.find((check) => String(check?.id || '').trim() === checkId) || null;
}

function gatherBots(gateReport) {
  if (!existsSync(BOTS_DIR)) return { active: [], paperPending: [] };
  const botDefinitions = [];
  const entries = readdirSync(BOTS_DIR, { withFileTypes: true });
  for (const e of entries) {
    if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.ts'))) {
      botDefinitions.push(e.name.replace(/\.(md|ts)$/, ''));
    }
  }

  const p5 = extractGateCheck(gateReport, 'P5');
  const evidence = Array.isArray(p5?.evidence) ? p5.evidence : [];
  const operationalBots = evidence
    .filter((item) => typeof item === 'string' && item.startsWith('bots/') && item.endsWith('.md'))
    .map((item) => item.split('/').pop()?.replace(/\.md$/, '') || '')
    .filter(Boolean);

  const activeSet = new Set(operationalBots.length > 0 ? operationalBots : botDefinitions);
  const active = botDefinitions.filter((name) => activeSet.has(name));
  const paperPending = botDefinitions.filter((name) => !activeSet.has(name));

  return {
    active,
    paperPending
  };
}

function gatherProducts() {
  const data = readJSON(CATALOG, {});
  const products = data.products || data || [];
  if (!Array.isArray(products)) return { total: 0, active: 0, items: [] };
  return {
    total: products.length,
    active: products.filter(p => p.status === 'active').length,
    paused: products.filter(p => p.status === 'paused').length,
    planned: products.filter(p => p.status === 'planned').length,
    items: products.map(p => ({
      id: p.id,
      name: p.name || p.id,
      status: p.status || 'unknown',
      plans: (p.plans || []).map(pl => `${pl.name}: $${pl.price}/mo`).join(', ')
    }))
  };
}

function normalizeSeverity(value) {
  const sev = String(value || '').trim().toLowerCase();
  if (sev === 'critical' || sev === 'high' || sev === 'medium' || sev === 'low') return sev;
  return 'medium';
}

function gatherFinishedProducts() {
  if (!existsSync(FINISHED_PRODUCTS_DIR)) return [];
  const entries = readdirSync(FINISHED_PRODUCTS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      status: 'imported-to-monolith',
      location: `products/finished/${entry.name}`,
      note: 'Producto importado desde repo externo.'
    }));
}

function gatherDevelopment(gateReport, tasksData) {
  const gaps = [];
  const checks = Array.isArray(gateReport?.checks) ? gateReport.checks : [];
  const ownerNextActions = Array.isArray(gateReport?.ownerNextActions) ? gateReport.ownerNextActions : [];
  const tasks = Array.isArray(tasksData?.tasks) ? tasksData.tasks : [];

  for (const check of checks) {
    const status = String(check?.status || '').trim().toUpperCase();
    if (status !== 'FAIL' && status !== 'WARN') continue;
    gaps.push({
      id: String(check?.id || `gate-${gaps.length + 1}`),
      title: String(check?.title || 'Gate check pendiente').trim(),
      severity: normalizeSeverity(check?.severity),
      requiresHuman: true,
      source: 'production-gate',
      nextAction: String(check?.ownerAction || '').trim() || null
    });
  }

  for (const action of ownerNextActions) {
    gaps.push({
      id: `${String(action?.id || 'gate')}-owner-action`,
      title: String(action?.action || 'Owner action pendiente').trim(),
      severity: 'critical',
      requiresHuman: true,
      source: 'owner-next-actions',
      nextAction: String(action?.action || '').trim() || null
    });
  }

  for (const task of tasks) {
    const status = String(task?.status || '').trim().toLowerCase();
    if (status === 'done') continue;
    gaps.push({
      id: String(task?.id || `task-${gaps.length + 1}`),
      title: String(task?.title || 'Task pendiente').trim(),
      severity: normalizeSeverity(String(task?.priority || '').trim().toLowerCase() === 'p0' ? 'critical' : 'high'),
      requiresHuman: String(task?.owner || '').trim().toLowerCase() === 'human',
      source: 'tasks',
      nextAction: String(task?.nextAction || '').trim() || null
    });
  }

  const uniqueGaps = [];
  const seen = new Set();
  for (const gap of gaps) {
    const key = `${gap.id}|${gap.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueGaps.push(gap);
  }

  return {
    gaps: uniqueGaps,
    finishedProducts: gatherFinishedProducts(),
    sealed: uniqueGaps.length === 0
  };
}

function deriveServiceStatus(gateReport, checkId) {
  const check = extractGateCheck(gateReport, checkId);
  const status = String(check?.status || '').trim().toUpperCase();
  if (status === 'PASS') return 'OK';
  if (status === 'FAIL') return 'FAIL';
  return 'UNKNOWN';
}

function normalizeBillingStatus(value) {
  const normalized = String(value || 'unknown').trim().toUpperCase();
  if (normalized === 'OK' || normalized === 'MATCH') return 'MATCH';
  if (normalized === 'MISMATCH') return 'MISMATCH';
  if (normalized === 'UNKNOWN') return 'UNKNOWN';
  return 'UNKNOWN';
}

function deriveSystemGate(gateReport, billingStatus) {
  if (billingStatus !== 'MATCH') {
    return billingStatus === 'MISMATCH' ? 'NO_GO' : 'UNKNOWN';
  }

  const gate = String(gateReport?.gateStatus || '').trim().toUpperCase();
  if (gate === 'GO' || gate === 'GO_WITH_WARNINGS' || gate === 'NO_GO') {
    return gate;
  }
  return 'UNKNOWN';
}

function main() {
  console.log('Generating unified dashboard data...\n');

  const agentMonitor = readJSON(AGENT_MONITOR, { summary: { totalAgents: 0 }, agents: [] });
  const tasksData = readJSON(TASKS, { tasks: [] });
  const landingsData = readJSON(LANDINGS, null);
  const campaigns = gatherCampaigns();
  const products = gatherProducts();
  const billingReport = readJSON(BILLING_RECONCILIATION, null);
  const gateReport = readJSON(PRODUCTION_GATE, null);
  const bots = gatherBots(gateReport);
  const devData = gatherDevelopment(gateReport, tasksData);
  const billingStatus = normalizeBillingStatus(billingReport?.status);
  const derivedGate = deriveSystemGate(gateReport, billingStatus);

  const totalTasks = tasksData.tasks?.length || 0;
  const doneTasks = tasksData.tasks?.filter(t => t.status === 'done').length || 0;
  const pendingTasks = totalTasks - doneTasks;

  const unified = {
    generatedAt: new Date().toISOString(),
    monetization: {
      leadsToday: null,
      generatedContent: campaigns.total,
      activeBots: bots.active.length,
      averagePrice: null
    },
    funnel: {
      stages: ['Visit', 'Lead', 'Trial', 'Checkout', 'Paid'],
      activeStage: 'Lead'
    },
    campaigns,
    bots,
    products,
    tasks: {
      total: totalTasks,
      done: doneTasks,
      pending: pendingTasks,
      items: tasksData.tasks || []
    },
    landings: landingsData,
    agentMonitor,
    billing: {
      status: billingStatus,
      mismatchCount: Number.isFinite(Number(billingReport?.totals?.mismatchCount))
        ? Number(billingReport.totals.mismatchCount)
        : null,
      generatedAt: billingReport?.generatedAt || null
    },
    development: devData,
    systemStatus: {
      automation: deriveServiceStatus(gateReport, 'P4'),
      dashboard: deriveServiceStatus(gateReport, 'P19'),
      checkout: billingStatus === 'MATCH' ? 'OK' : billingStatus,
      gate: derivedGate
    }
  };

  mkdirSync(RUNTIME, { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(unified, null, 2), 'utf-8');
  console.log(`  Monetization KPIs: leads=${unified.monetization.leadsToday ?? 'UNKNOWN'}, content=${unified.monetization.generatedContent}, bots=${unified.monetization.activeBots}`);
  console.log(`  Campaigns: ${campaigns.total} total, ${campaigns.recent.length} recent`);
  console.log(`  Products: ${products.total} (${products.active} active, ${products.paused} paused, ${products.planned} planned)`);
  console.log(`  Bots: ${bots.active.length} active, ${bots.paperPending.length} paper`);
  console.log(`  Tasks: ${totalTasks} (${doneTasks} done, ${pendingTasks} pending)`);
  console.log(`  Agent Monitor: ${agentMonitor.summary.totalAgents} agents (${agentMonitor.summary.activeAgents} active)`);
  console.log(`  Billing: ${unified.billing.status} | Gate: ${unified.systemStatus.gate}`);
  console.log(`  Dev gaps: ${devData.gaps.length}`);
  console.log(`\nSaved: ${OUTPUT}`);
}

main();
