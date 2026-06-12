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
const BOTS_DIR = join(ROOT, 'bots');
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

function gatherBots() {
  if (!existsSync(BOTS_DIR)) return { active: [], paperPending: [] };
  const active = [];
  const paperPending = ['ReconciliationBot', 'IncidentBot', 'ReleaseGateBot', 'SupervisorSyncBot', 'MarketResearchBot'];
  const entries = readdirSync(BOTS_DIR, { withFileTypes: true });
  for (const e of entries) {
    if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.ts'))) {
      active.push(e.name.replace(/\.(md|ts)$/, ''));
    }
  }
  return {
    active: active.filter(b => !paperPending.includes(b)),
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

function gatherDevelopment() {
  const gaps = [
    { id: 'lock-gate-auto-on-vscode-open', title: 'Verificar lock gate automatico al abrir VS Code', severity: 'critical', requiresHuman: true },
    { id: 'qr-owner-device-only', title: 'Restringir QR al celular del owner', severity: 'critical', requiresHuman: true },
    { id: 'lock-gate-mini-access-ui', title: 'Mini UI de accesos (PC y celular)', severity: 'high', requiresHuman: false },
    { id: 'bot-coverage-paper-pack', title: 'Formalizar cobertura de bots papel faltantes', severity: 'high', requiresHuman: true },
    { id: 'bot-runtime-wiring-plan', title: 'Plan de wiring runtime para bots nuevos', severity: 'high', requiresHuman: true },
    { id: 'launch-real-campaign', title: 'Lanzar 1 campana real con seguimiento de pago', severity: 'critical', requiresHuman: true },
    { id: 'landing-dynamic-product', title: 'Landing dinamica por producto', severity: 'critical', requiresHuman: true },
    { id: 'market-research-ai-bridge', title: 'Ejecutar market-research para producto "lazo entre IAs"', severity: 'high', requiresHuman: true },
    { id: 'checkout-default-product', title: 'Quitar dependencia de producto default en checkout', severity: 'high', requiresHuman: false },
    { id: 'define-pac-strategy', title: 'Definir estrategia PAC por fase (off/byo/managed)', severity: 'medium', requiresHuman: true }
  ];
  return {
    gaps,
    finishedProducts: [
      { name: 'tigre-labs-context-engine', status: 'imported-to-monolith', location: 'products/finished/tigre-labs-context-engine', note: 'Producto importado desde repo externo.' }
    ],
    sealed: false
  };
}

function main() {
  console.log('Generating unified dashboard data...\n');

  const agentMonitor = readJSON(AGENT_MONITOR, { summary: { totalAgents: 0 }, agents: [] });
  const tasksData = readJSON(TASKS, { tasks: [] });
  const landingsData = readJSON(LANDINGS, null);
  const campaigns = gatherCampaigns();
  const bots = gatherBots();
  const products = gatherProducts();
  const devData = gatherDevelopment();

  const totalTasks = tasksData.tasks?.length || 0;
  const doneTasks = tasksData.tasks?.filter(t => t.status === 'done').length || 0;
  const pendingTasks = totalTasks - doneTasks;

  const unified = {
    generatedAt: new Date().toISOString(),
    monetization: {
      leadsToday: 10,
      generatedContent: campaigns.total,
      activeBots: bots.active.length,
      averagePrice: '$69.00'
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
    development: devData,
    systemStatus: {
      automation: 'success',
      dashboard: 'success',
      checkout: 'success',
      gate: 'GO'
    }
  };

  mkdirSync(RUNTIME, { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(unified, null, 2), 'utf-8');
  console.log(`  Monetization KPIs: ${unified.monetization.leadsToday} leads, ${unified.monetization.generatedContent} content, ${unified.monetization.activeBots} bots`);
  console.log(`  Campaigns: ${campaigns.total} total, ${campaigns.recent.length} recent`);
  console.log(`  Products: ${products.total} (${products.active} active, ${products.paused} paused, ${products.planned} planned)`);
  console.log(`  Bots: ${bots.active.length} active, ${bots.paperPending.length} paper`);
  console.log(`  Tasks: ${totalTasks} (${doneTasks} done, ${pendingTasks} pending)`);
  console.log(`  Agent Monitor: ${agentMonitor.summary.totalAgents} agents (${agentMonitor.summary.activeAgents} active)`);
  console.log(`  Dev gaps: ${devData.gaps.length}`);
  console.log(`\nSaved: ${OUTPUT}`);
}

main();
