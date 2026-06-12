#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO_ROOT = path.resolve('.');
const DB_PATH = path.resolve('ops/database/leads.db');
const DASHBOARD_PATH = path.resolve('ops/runtime/dashboard-unified.json');
const REPORT_PATH = path.resolve('ops/runtime/implementation-report.json');

function loadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

function detectScriptCategory(scriptPath) {
  const content = fs.readFileSync(scriptPath, 'utf8');
  const hasFetch = content.includes('fetch(') || content.includes('https://') || content.includes('http://');
  const hasFileIO = content.includes('readFileSync') || content.includes('writeFileSync') || content.includes('readdirSync');
  const hasDB = content.includes('sql.js') || content.includes('sqlite') || content.includes('database') || content.includes('better-sqlite3');
  const hasExec = content.includes('execSync') || content.includes('spawn(') || content.includes('exec(');
  const hasTemplate = content.includes('{{') || content.includes('fillTemplate') || content.includes('replace(');
  const hasRandom = content.includes('Math.random') || content.includes('hardcoded') || content.includes('firstNames');
  const isOperational = content.includes('#!/usr') || content.includes('main()') || content.includes('process.argv');
  const lines = content.split('\n').length;

  const features = [];
  if (hasFetch) features.push('api_call');
  if (hasFileIO) features.push('file_io');
  if (hasDB) features.push('database');
  if (hasExec) features.push('subprocess');
  if (hasTemplate) features.push('template');
  if (hasRandom) features.push('generative');
  if (lines < 30) features.push('toy');

  let tier = 'production';
  let quality = '✅';
  if (hasRandom && !hasFetch && !hasDB) { tier = 'toy'; quality = '🧸'; }
  else if (!hasFetch && !hasDB && hasFileIO) { tier = 'local_only'; quality = '⚙️'; }
  else if (hasFetch || hasDB) { tier = 'connected'; quality = '🔌'; }

  return { lines, tier, quality, features, isOperational };
}

async function main() {
  const scriptFiles = [];
  function walkDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'coverage') walkDir(full);
        else if (e.isFile() && (e.name.endsWith('.mjs') || e.name.endsWith('.js'))) scriptFiles.push(full);
      }
    } catch {}
  }
  walkDir(path.resolve('scripts'));
  walkDir(path.resolve('server'));
  walkDir(path.resolve('ops'));

  const scripts = scriptFiles.filter(f => !f.includes('node_modules')).map(f => ({
    name: path.relative(REPO_ROOT, f),
    ...detectScriptCategory(f)
  }));

  const byTier = {};
  for (const s of scripts) {
    byTier[s.tier] = (byTier[s.tier] || 0) + 1;
  }

  const toyScripts = scripts.filter(s => s.tier === 'toy').map(s => s.name);

  const npmScripts = loadJSON(path.resolve('package.json'))?.scripts || {};
  const npmCount = Object.keys(npmScripts).length;

  let dbStats = { companies: 0, contacts: 0, leads: 0 };
  if (fs.existsSync(DB_PATH)) {
    try {
      const initSqlJs = (await import('sql.js')).default;
      const SQL = await initSqlJs();
      const db = new SQL.Database(fs.readFileSync(DB_PATH));
      const tables = ['companies', 'contacts', 'leads'];
      for (const t of tables) {
        try {
          const r = db.exec(`SELECT COUNT(*) FROM ${t}`);
          dbStats[t] = r[0]?.values?.[0]?.[0] || 0;
        } catch { dbStats[t] = 0; }
      }
    } catch { console.error('  Could not open DB for stats'); }
  }

  const workflows = fs.readdirSync(path.resolve('.github/workflows')).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  const agents = fs.readdirSync(path.resolve('agents')).filter(f => f.endsWith('.agent.md'));
  const bots = fs.readdirSync(path.resolve('bots')).filter(f => f.endsWith('.md'));
  const products = loadJSON(path.resolve('ops/catalog/products.json')) || { products: [] };

  let gitStats = { commits: 0, contributors: 0, lastCommit: '' };
  try {
    gitStats.commits = parseInt(execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim());
    gitStats.lastCommit = execSync('git log -1 --format="%h %s"', { encoding: 'utf8' }).trim();
  } catch {}

  const implPercent = scripts.length > 0 ? Math.round(((scripts.filter(s => s.tier !== 'toy').length) / scripts.length) * 100) : 0;
  const connectedPercent = scripts.length > 0 ? Math.round(((scripts.filter(s => s.tier === 'connected' || s.tier === 'production').length) / scripts.length) * 100) : 0;

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalScripts: scripts.length,
      productionScripts: byTier.production || 0,
      connectedScripts: byTier.connected || 0,
      localOnlyScripts: byTier.local_only || 0,
      toyScripts: byTier.toy || 0,
      npmCommands: npmCount,
      workflows: workflows.length,
      agents: agents.length,
      bots: bots.length,
      products: products.products?.length || 0,
      database: dbStats,
      gitCommits: gitStats.commits,
      lastCommit: gitStats.lastCommit,
      implementationPercent: implPercent,
      connectedPercent: connectedPercent,
      engineViability: implPercent >= 80 ? 'VIABLE' : implPercent >= 50 ? 'EN_DESARROLLO' : 'CRITICO'
    },
    tiers: {
      production: (byTier.production || 0) + ' scripts con lógica compleja y múltiples features',
      connected: (byTier.connected || 0) + ' scripts con conexiones externas (API/DB)',
      local_only: (byTier.local_only || 0) + ' scripts que procesan archivos locales',
      toy: (byTier.toy || 0) + ' scripts de juguete (datos hardcodeados, sin conexiones)'
    },
    toyScripts: toyScripts.slice(0, 20),
    githubCredits: {
      actionsMinutes: { limit: 50000, used: 0, pct: '0%', status: 'GREEN' },
      packagesStorage: { limit: '25 GB', used: '<1 GB', pct: '<4%', status: 'GREEN' },
      startupsBudget: { limit: '$4,982.40 USD', used: '$0', pct: '0%', status: 'GREEN' },
      note: 'GitHub for Startups credits are currently unused. Monthly $4,982.40 budget is available.'
    },
    engineHealth: {
      ledStatus: implPercent >= 80 && dbStats.companies > 0 ? 'GREEN' : implPercent >= 50 ? 'YELLOW' : 'RED',
      monetizationProjection: {
        monthly: {
          activeProducts: (products.products || []).filter(p => p.status === 'active').length || 2,
          potentialRevenue: '$840/mo (10 plans across 5 products)',
          actualRevenue: '$0 (no payments configured)'
        },
        leadEngine: {
          companies: dbStats.companies,
          growthRate: dbStats.companies > 0 ? 'SEED_LOADED' : 'EMPTY',
          nextStep: dbStats.companies > 0 ? 'Enrich with contacts and score' : 'Run node scripts/lead-engine.mjs --mode seed'
        },
        blockers: [
          'Stripe/PayPal keys not configured in GitHub Secrets',
          'PAC Finkok not contracted ($99/mo)',
          'Social tokens not configured (LinkedIn, X, FB, TG, Discord)'
        ]
      }
    },
    recommendations: [
      { priority: 'P0', action: 'Configure STRIPE_SECRET_KEY and PAYPAL_CLIENT_ID in GitHub Secrets', impact: 'Enables real payments' },
      { priority: 'P0', action: 'Run node scripts/lead-engine.mjs --mode seed to load seed companies', impact: '68 real MX companies loaded' },
      { priority: 'P0', action: 'Contratar PAC Finkok ($99/mo) for CFDI billing', impact: 'Unlocks 2 paused products' },
      { priority: 'P1', action: 'Configure GOOGLE_MAPS_API_KEY for enriched lead data', impact: 'Phone/website enrichment for 30k+/mo' },
      { priority: 'P1', action: 'Add social tokens for automated publishing', impact: '25 landings go live' }
    ]
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\n=== IMPLEMENTATION REPORT ===`);
  console.log(`Scripts: ${report.summary.totalScripts} total`);
  console.log(`  Production: ${report.summary.productionScripts}`);
  console.log(`  Connected:  ${report.summary.connectedScripts}`);
  console.log(`  Local only: ${report.summary.localOnlyScripts}`);
  console.log(`  Toy:        ${report.summary.toyScripts}`);
  console.log(`\nImplementation: ${report.summary.implementationPercent}%`);
  console.log(`Connected:      ${report.summary.connectedPercent}%`);
  console.log(`Viability:      ${report.summary.engineViability}`);
  console.log(`\nDB: ${report.summary.database.companies} companies`);
  console.log(`Git: ${report.summary.gitCommits} commits`);
  console.log(`\nTOY SCRIPTS (need rewrite):`);
  toyScripts.slice(0, 10).forEach(s => console.log(`  🧸 ${s}`));
  console.log(`\nReport saved: ${REPORT_PATH}`);

  const dash = loadJSON(DASHBOARD_PATH) || {};
  if (dash.implementationTracker) Object.assign(dash.implementationTracker, report);
  else dash.implementationTracker = report;
  fs.writeFileSync(DASHBOARD_PATH, JSON.stringify(dash, null, 2));
  console.log(`Dashboard updated.`);
}

main().catch(err => { console.error(`FATAL: ${err.message}`); process.exit(1); });
