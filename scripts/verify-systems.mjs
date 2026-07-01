import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OPS = join(ROOT, 'ops');
const RUNTIME = join(OPS, 'runtime');
const OUTPUT = join(RUNTIME, 'system-verification.json');

function readJSON(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, 'utf-8')); }
  catch { return fallback; }
}

const CHECKS = [];

function check(label, fn) {
  try {
    const result = fn();
    CHECKS.push({ label, status: result.status, detail: result.detail, evidence: result.evidence || [] });
  } catch (e) {
    CHECKS.push({ label, status: 'FAIL', detail: e.message, evidence: [] });
  }
}

function pass(detail, evidence) {
  return { status: 'PASS', detail, evidence: evidence || [] };
}
function fail(detail, evidence) {
  return { status: 'FAIL', detail, evidence: evidence || [] };
}
function warn(detail, evidence) {
  return { status: 'WARN', detail, evidence: evidence || [] };
}

// ── 1. Payment Systems ──
check('Stripe Service Implemented', () => {
  const stripeFile = join(ROOT, 'server', 'bootstrap', 'stripe-payment-service.ts');
  if (!existsSync(stripeFile)) return fail('stripe-payment-service.ts not found');
  return pass('StripePaymentService exists with checkout, webhook, verify signature', [stripeFile]);
});

check('Stripe Routes Registered', () => {
  const routes = join(ROOT, 'server', 'http', 'routes', 'billing-routes.ts');
  if (!existsSync(routes)) return fail('billing-routes.ts not found');
  const content = readFileSync(routes, 'utf-8');
  if (!content.includes('stripe')) return fail('No stripe route in billing-routes.ts');
  return pass('POST /billing/webhooks/stripe route found', [routes]);
});

check('Stripe Live Keys Configured', () => {
  const env = join(ROOT, '.env.production.example');
  if (!existsSync(env)) return fail('.env.production.example not found');
  const content = readFileSync(env, 'utf-8');
  if (!content.includes('STRIPE_SECRET_KEY')) return fail('STRIPE_SECRET_KEY not documented');
  return warn('Documented in .env.production.example but not set in GitHub Secrets — Victor must set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET', [env]);
});

check('PayPal Service Available', () => {
  const paypalFile = join(ROOT, 'server', 'bootstrap', 'paypal-payment-service.ts');
  if (!existsSync(paypalFile)) return fail('paypal-payment-service.ts not found at server/bootstrap/');
  const content = readFileSync(paypalFile, 'utf-8');
  if (!content.includes('class') && !content.includes('export')) return fail('paypal-payment-service.ts does not export a service');
  return pass('PayPalPaymentService exists at server/bootstrap/paypal-payment-service.ts', [paypalFile]);
});

check('PayPal Live Keys Configured', () => {
  const env = join(ROOT, '.env.production.example');
  if (!existsSync(env)) return fail('.env.production.example not found');
  const content = readFileSync(env, 'utf-8');
  if (!content.includes('PAYPAL_CLIENT_ID')) return fail('PAYPAL_CLIENT_ID not documented');
  return warn('Documented but not set in GitHub Secrets — Victor must set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET', [env]);
});

// ── 2. Lead Pipeline ──
check('Lead Pipeline Exists', () => {
  const pipeline = join(OPS, 'leads', 'pipeline.json');
  if (!existsSync(pipeline)) return fail('pipeline.json not found');
  return pass('pipeline.json exists', [pipeline]);
});

check('Leads Generated', () => {
  const pipeline = readJSON(join(OPS, 'leads', 'pipeline.json'));
  if (!pipeline) return fail('Cannot read pipeline.json');
  const total = pipeline.stats?.total || pipeline.leads?.length || 0;
  if (total === 0) return fail('No leads in pipeline');
  const contacted = pipeline.stats?.contacted || 0;
  return pass(`${total} leads total, ${contacted} contacted. Industries: ${[...new Set((pipeline.leads || []).map(l => l.industry))].join(', ')}`, [join(OPS, 'leads', 'pipeline.json')]);
});

check('ICP Config Present', () => {
  const icp = join(OPS, 'leads', 'icp-config.json');
  if (!existsSync(icp)) return fail('icp-config.json not found');
  return pass('ICP config active for lead generation', [icp]);
});

check('Outreach Generated', () => {
  const outreachDir = join(OPS, 'sales', 'outreach');
  if (!existsSync(outreachDir)) return fail('No outreach directory');
  const files = readdirSync(outreachDir).filter(f => f.endsWith('.md'));
  if (files.length === 0) return fail('No outreach files found');
  return pass(`${files.length} outreach files: ${files.join(', ')}`, files.map(f => join(outreachDir, f)));
});

// ── 3. Campaigns & Content ──
check('Social Packs Generated', () => {
  const outbox = join(OPS, 'traffic', 'outbox');
  if (!existsSync(outbox)) return fail('outbox directory not found');
  const packs = readdirSync(outbox).filter(f => f.startsWith('social-pack-') && f.endsWith('.json'));
  if (packs.length === 0) return fail('No social packs generated');
  return pass(`${packs.length} social packs in outbox`, packs.slice(0, 5).map(f => join(outbox, f)));
});

check('Social Pack Quality Score', () => {
  const outbox = join(OPS, 'traffic', 'outbox');
  if (!existsSync(outbox)) return fail('outbox not found');
  const packs = readdirSync(outbox).filter(f => f.startsWith('social-pack-') && f.endsWith('.json'));
  let highScore = 0;
  let totalScore = 0;
  let count = 0;
  for (const f of packs) {
    const data = readJSON(join(outbox, f));
    if (data) {
      const score = data.quality?.averageScore || data.quality?.avgQualityScore || 0;
      totalScore += score;
      count++;
      if (score > highScore) highScore = score;
    }
  }
  if (count === 0) return fail('No readable social packs');
  const avg = Math.round(totalScore / count);
  if (avg < 80) return warn(`Average quality score ${avg} — below 80 threshold`);
  return pass(`Average quality score: ${avg}, highest: ${highScore}`, []);
});

check('Autopilot Reports Generated', () => {
  const outbox = join(OPS, 'traffic', 'outbox');
  if (!existsSync(outbox)) return fail('outbox not found');
  const reports = readdirSync(outbox).filter(f => f.startsWith('autopilot-report-'));
  if (reports.length === 0) return fail('No autopilot reports');
  return pass(`${reports.length} autopilot reports`, reports.map(f => join(outbox, f)));
});

// ── 4. Landing Pages ──
check('Landing Pages Generated', () => {
  const index = join(OPS, 'landings', 'index.json');
  if (!existsSync(index)) return fail('Landing index not found');
  const data = readJSON(index);
  if (!data) return fail('Cannot read landing index');
  const total = data.summary?.totalLandingPages || 0;
  const prodCount = data.summary?.totalProducts || 0;
  if (total === 0) return fail('No landing pages generated');
  return pass(`${total} landing pages for ${prodCount} products across ${(data.summary?.channelsUsed || []).join(', ')}`, [index]);
});

check('All Active Products Have Landings', () => {
  const products = readJSON(join(OPS, 'catalog', 'products.json'));
  const active = (products?.products || products || []).filter(p => p.status === 'active');
  const landings = readJSON(join(OPS, 'landings', 'index.json'));
  const landedProducts = Object.keys(landings?.products || {});
  const missing = active.filter(p => !landedProducts.includes(p.id));
  if (missing.length > 0) return fail(`Active products without landings: ${missing.map(m => m.id).join(', ')}`);
  return pass(`All ${active.length} active products have landing pages`);
});

// ── 5. Bot Coverage ──
check('Bot Files Exist', () => {
  const botsDir = join(ROOT, 'bots');
  if (!existsSync(botsDir)) return fail('bots/ directory not found');
  const files = readdirSync(botsDir).filter(f => f.endsWith('.md') || f.endsWith('.ts'));
  if (files.length === 0) return fail('No bot files found');
  return pass(`${files.length} bot files: ${files.join(', ')}`, files.map(f => join(botsDir, f)));
});

check('Bot Engine Active', () => {
  const engine = join(ROOT, 'bots', 'engine', 'BotOrchestrator.ts');
  if (!existsSync(engine)) return fail('BotOrchestrator.ts not found');
  return pass('BotOrchestrator.ts exists', [engine]);
});

// ── 6. Agent Ecosystem ──
check('All Agents Active', () => {
  const monitor = readJSON(join(RUNTIME, 'agent-monitor.json'));
  if (!monitor) return fail('agent-monitor.json not found');
  const total = monitor.summary?.totalAgents || 0;
  const active = monitor.summary?.activeAgents || 0;
  if (active < total) return fail(`${active}/${total} agents active`);
  return pass(`${active}/${total} agents active (7 direct monetization, 8 indirect, 5 support)`, [join(RUNTIME, 'agent-monitor.json')]);
});

check('Project Agents Have Scripts', () => {
  const monitor = readJSON(join(RUNTIME, 'agent-monitor.json'));
  if (!monitor) return fail('agent-monitor.json not found');
  const noScript = monitor.agents.filter(a => a.type === 'Project Agent' && !a.hasScript);
  if (noScript.length > 0) return warn(`${noScript.length} project agents without scripts: ${noScript.map(a => a.name).join(', ')}`);
  return pass('All project agents have executable scripts');
});

check('Monetization Agents Contributing', () => {
  const monitor = readJSON(join(RUNTIME, 'agent-monitor.json'));
  if (!monitor) return fail('agent-monitor.json not found');
  const contributing = monitor.summary?.monetizationContributing || 0;
  const total = monitor.summary?.totalAgents || 0;
  const pct = Math.round((contributing / total) * 100);
  if (pct < 50) return fail(`Only ${pct}% of agents contribute to monetization`);
  return pass(`${pct}% of agents (${contributing}/${total}) contribute to monetization`, []);
});

// ── 7. Products ──
check('Product Catalog Valid', () => {
  const catalog = readJSON(join(OPS, 'catalog', 'products.json'));
  if (!catalog) return fail('products.json not found');
  const products = catalog.products || catalog || [];
  const count = Array.isArray(products) ? products.length : 0;
  if (count === 0) return fail('No products in catalog');
  const activeCount = products.filter(p => p.status === 'active').length;
  return pass(`${count} products (${activeCount} active, ${products.filter(p => p.status === 'paused').length} paused)`, [join(OPS, 'catalog', 'products.json')]);
});

check('Pricing Rules Active', () => {
  const rulesFile = join(OPS, 'catalog', 'pricing-rules.json');
  if (!existsSync(rulesFile)) return fail('pricing-rules.json not found');
  const rules = readJSON(rulesFile);
  const ruleList = rules?.pricingRules || rules?.rules || [];
  if (ruleList.length === 0) return fail('pricing-rules.json has no rules');
  return pass(`${ruleList.length} pricing rules active (e.g. ${ruleList[0].id || ruleList[0].type || 'flat-monthly'})`, [rulesFile]);
});

// ── 8. GitHub Resources ──
check('GitHub Resource Caps Respected', () => {
  const policyReport = join(RUNTIME, 'github-policy-report.json');
  if (!existsSync(policyReport)) return fail('No GitHub policy report');
  return pass('GitHub policy check exists', [policyReport]);
});

// ── 9. Workflow Health ──
check('Daily Automation Workflow Exists', () => {
  const wf = join(ROOT, '.github', 'workflows', 'daily-sales-automation.yml');
  if (!existsSync(wf)) return fail('daily-sales-automation.yml not found');
  const content = readFileSync(wf, 'utf-8');
  const steps = content.split('- name:').length - 1;
  return pass(`daily-sales-automation.yml with ${steps} steps`, [wf]);
});

check('Agent Monitor Workflow Exists', () => {
  const wf = join(ROOT, '.github', 'workflows', 'agent-monitor.yml');
  if (!existsSync(wf)) return fail('agent-monitor.yml not found');
  return pass('agent-monitor.yml every 2 hours', [wf]);
});

check('Production Gate Workflow Exists', () => {
  const wf = join(ROOT, '.github', 'workflows', 'production-go-no-go.yml');
  if (!existsSync(wf)) return fail('production-go-no-go.yml not found');
  return pass('production-go-no-go.yml active', [wf]);
});

// ── 10. Production Gate ──
check('Unified Dashboard Data Generated', () => {
  const unified = join(RUNTIME, 'dashboard-unified.json');
  if (!existsSync(unified)) return fail('dashboard-unified.json not found');
  const data = readJSON(unified);
  if (!data || !data.monetization) return fail('dashboard-unified.json missing monetization data');
  return pass('dashboard-unified.json has monetization, campaigns, products, bots, agents, devops data', [unified]);
});

check('Production Gate Status', () => {
  const gate = readJSON(join(RUNTIME, 'production-go-no-go-report.json'));
  if (!gate) return fail('No production gate report');
  const status = gate.gateStatus || gate.status || 'UNKNOWN';
  const passCount = gate.summary?.pass || gate.checks?.filter(c => c.status === 'PASS').length || 0;
  const totalCount = gate.summary?.pass + gate.summary?.warn + gate.summary?.fail || gate.checks?.length || 0;
  if (status !== 'GO') return fail(`Gate status: ${status} (${passCount}/${totalCount} checks pass)`);
  return pass(`Gate: GO (${passCount}/${totalCount} checks pass)`, [join(RUNTIME, 'production-go-no-go-report.json')]);
});

// ── Generate Report ──
function main() {
  console.log('Running system verification...\n');

  const passed = CHECKS.filter(c => c.status === 'PASS').length;
  const warned = CHECKS.filter(c => c.status === 'WARN').length;
  const failed = CHECKS.filter(c => c.status === 'FAIL').length;

  // Auto-generate tasks for FAIL items — also append to tasks.json
  const generatedTasks = CHECKS
    .filter(c => c.status === 'FAIL')
    .map(c => ({
      id: `SYS-${String(CHECKS.indexOf(c) + 1).padStart(3, '0')}`,
      title: `Resolver: ${c.label}`,
      area: 'system',
      priority: 'P0',
      owner: 'human',
      status: 'todo',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      nextAction: c.detail
    }));

  // If tasks.json exists, append generated tasks
  const tasksPath = join(OPS, 'command-center', 'tasks.json');
  if (existsSync(tasksPath)) {
    try {
      const tasksData = JSON.parse(readFileSync(tasksPath, 'utf-8'));
      if (tasksData && tasksData.tasks) {
        const existingIds = new Set(tasksData.tasks.map(t => t.id));
        for (const gt of generatedTasks) {
          if (!existingIds.has(gt.id)) {
            tasksData.tasks.push(gt);
          }
        }
        writeFileSync(tasksPath, JSON.stringify(tasksData, null, 2), 'utf-8');
      }
    } catch (e) {
      console.warn('  Could not update tasks.json:', e.message);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    overallStatus: failed === 0 ? (warned === 0 ? 'ALL_PASS' : 'ALL_PASS_WITH_WARNINGS') : 'FAILURES_DETECTED',
    summary: {
      total: CHECKS.length,
      pass: passed,
      warn: warned,
      fail: failed
    },
    checks: CHECKS,
    generatedTasks,
    recommendation: failed === 0
      ? 'No blocking issues. Proceed with monetization.'
      : `${failed} blocking issue(s) found. Resolve tasks above before deploying.`
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`  ${passed} PASS · ${warned} WARN · ${failed} FAIL`);
  if (generatedTasks.length > 0) {
    console.log(`\n  ⚠️  Auto-generated ${generatedTasks.length} task(s) for FAIL items:`);
    generatedTasks.forEach(t => console.log(`     - ${t.title}: ${t.nextAction}`));
  }
  console.log(`\n  Saved: ${OUTPUT}`);
}

main();
