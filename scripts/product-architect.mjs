import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');
const SERVER = join(ROOT, 'server');
const SHARED = join(ROOT, 'shared');
const BOTS = join(ROOT, 'bots');
const PKG = join(ROOT, 'package.json');
const OUTPUT_DIR = join(ROOT, 'ops', 'artifacts');
const CATALOG_PATH = join(ROOT, 'ops', 'catalog', 'products.json');
const SCORES_PATH = join(ROOT, 'ops', 'runtime', 'product-scores.json');
const ROADMAPS_PATH = join(ROOT, 'ops', 'runtime', 'product-roadmaps.json');
const RND_PATH = join(ROOT, 'ops', 'runtime', 'rnd-pipeline.json');
const DASH_PATH = join(ROOT, 'ops', 'runtime', 'dashboard-unified.json');

function readJSON(p, fallback = null) {
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return fallback; }
}

function gitLogSince(days = 14) {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const out = execSync(`git log --since="${since}" --pretty=format:"%h %ad %s" --date=short`, { encoding: 'utf-8', cwd: ROOT });
    return out.trim().split('\n').filter(Boolean).slice(0, 30);
  } catch {
    return [];
  }
}

function generateSpecFromRND(idea) {
  return {
    id: idea.id,
    name: idea.name,
    category: idea.category,
    euRelevance: idea.euRelevance,
    investScore: idea.totalScore,
    competitors: idea.competitors || [],
    description: idea.description,
    spec: {
      targetMarket: idea.euRelevance === 'high' ? 'EU SMBs con requisitos regulatorios' : idea.euRelevance === 'critical' ? 'Empresas EU con compliance obligatorio' : 'Global SMBs',
      revenueModel: idea.category === 'fintech' ? 'Per-transaction + subscription' : 'SaaS subscription',
      suggestedPriceMonthly: idea.totalScore >= 85 ? 99 : idea.totalScore >= 80 ? 49 : 29,
      stack: ['Node.js 20+', 'TypeScript', 'REST API', 'PostgreSQL'],
      integrationPoints: idea.euRelevance !== 'low' ? ['Stripe', 'GitHub Packages', 'EU Data Residency'] : ['Stripe', 'GitHub Packages'],
      estimatedBuildWeeks: idea.totalScore >= 85 ? 4 : idea.totalScore >= 80 ? 6 : 8,
      status: 'planned-rd'
    },
    generatedAt: new Date().toISOString()
  };
}

function main() {
  console.log('ProductArchitect — analyzing repo and generating artifacts...\n');

  const pkg = existsSync(PKG) ? readFileSync(PKG, 'utf-8') : '{}';
  const pkgData = JSON.parse(pkg);
  const dirs = [];
  for (const d of [SRC, SERVER, SHARED, BOTS]) {
    if (existsSync(d)) {
      const files = readdirSync(d, { recursive: true }).filter(f => f.endsWith('.ts') || f.endsWith('.mjs'));
      dirs.push({ path: relative(ROOT, d), files: files.length });
    }
  }

  const appName = pkgData.name || 'tiger-lab-private';
  const appVersion = pkgData.version || '0.1.0';
  const appDesc = pkgData.description || 'Autonomous monetization engine';
  const deps = pkgData.dependencies ? Object.keys(pkgData.dependencies) : [];
  const devDeps = pkgData.devDependencies ? Object.keys(pkgData.devDependencies) : [];

  const totalFiles = dirs.reduce((s, d) => s + d.files, 0);
  const productType = deps.includes('express') || deps.includes('fastify') ? 'API' : 'SaaS';

  const catalog = readJSON(CATALOG_PATH, { products: [] });
  const scores = readJSON(SCORES_PATH, { productResults: [] });
  const roadmaps = readJSON(ROADMAPS_PATH, {});
  const rnd = readJSON(RND_PATH, { investIdeas: [], decisions: {} });

  const productLines = [];
  for (const p of (catalog.products || [])) {
    const score = scores.productResults?.find(r => r.product?.id === p.id);
    const roadmap = roadmaps[p.id];
    productLines.push(`- ${p.name}: ${score?.score || p.score || '?'}/100 [${p.tier || '?'}] (${p.status}) — ${p.targetTo95 || 'No roadmap'}`);
  }

  const rndSpecs = (rnd.investIdeas || []).map(generateSpecFromRND);
  const rndLines = rndSpecs.map(s => `- ${s.name}: INVEST ${s.investScore}/100 [${s.category}] EU:${s.euRelevance} — ${s.spec.suggestedPriceMonthly}/mo`);

  const gitLog = gitLogSince(60);

  const blueprint = `# ${appName} Blueprint

Version: ${appVersion}
Generated: ${new Date().toISOString()}
Product Type: ${productType}

## Summary

${appDesc}

## Architecture

\`\`\`mermaid
graph TD
  A[Client / UI] --> B[HTTP Server]
  B --> C[Controllers]
  C --> D[Services / Domain]
  D --> E[Persistence / Runtime State]
  F[Bots / Agents] --> B
  G[CLI Scripts] --> D
\`\`\`

## Tech Stack

- Runtime: Node.js 20+
- Language: TypeScript
- Testing: Vitest
- Payments: Stripe + PayPal
- State: JSON files in ops/runtime/

## Key Directories

${dirs.map(d => `- ${d.path}: ${d.files} source files`).join('\n')}

## Key Dependencies

${deps.slice(0, 15).map(d => `- ${d}`).join('\n')}

## Development Dependencies

${devDeps.slice(0, 10).map(d => `- ${d}`).join('\n')}

## Product Catalog (${(catalog.products || []).length} products)

${productLines.join('\n')}

## R&D INVEST Pipeline (${rndSpecs.length} ideas)

${rndLines.join('\n')}

## Improvements

1. Add integration tests (high priority)
2. Add request validation schemas (medium)
3. Add CI caching for faster builds (low)
`;

  const changelogEntries = gitLog.length > 0
    ? gitLog.map(l => `- ${l}`).join('\n')
    : `- No recent commits found in last 60 days`;

  const changelog = `# Changelog

All notable changes to this project will be documented in this file.

## [${appVersion}] - ${new Date().toISOString().split('T')[0]}

### Recent Commits (60d)
${changelogEntries}

### Added
- Stripe payment service with checkout, webhook, and signature verification
- PayPal payment service as fallback provider
- Lead intelligence pipeline with ICP config, outreach generation
- Social landing pages for 5 products across 5 channels
- Agent monitor scanning 22 agents across project
- Verification supervisor with 24 system checks
- Unified dashboard in ops/command-center/
${rndSpecs.length > 0 ? '- R&D INVEST pipeline: ' + rndSpecs.length + ' ideas scored for EU market' : ''}

### Changed
- Dashboard server root to ops/ for broader data access
- Payment routing to support dual provider (Stripe default, PayPal fallback)

### Fixed
- Dashboard fetch paths for unified data loading

### Security
- Payment signature verification for Stripe webhooks
- Auth middleware for billing routes
`;

  const buildScripts = {
    ...(pkgData.scripts || {}),
    "build:server": "tsc -p server/tsconfig.json",
    "build:ui": "vite build ui-host/",
    "package": "npm pack --dry-run"
  };

  const artifactPkg = {
    ...pkgData,
    scripts: buildScripts
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });

  writeFileSync(join(OUTPUT_DIR, 'blueprint.md'), blueprint, 'utf-8');
  writeFileSync(join(OUTPUT_DIR, 'CHANGELOG.md'), changelog, 'utf-8');
  writeFileSync(join(OUTPUT_DIR, 'package.json'), JSON.stringify(artifactPkg, null, 2), 'utf-8');

  if (rndSpecs.length > 0) {
    const specsOutput = {};
    for (const s of rndSpecs) {
      specsOutput[s.id] = s;
    }
    writeFileSync(join(OUTPUT_DIR, 'rnd-product-specs.json'), JSON.stringify(specsOutput, null, 2), 'utf-8');
  }

  const dash = readJSON(DASH_PATH, {});
  dash.productArchitect = {
    generatedAt: new Date().toISOString(),
    repoStats: { totalFiles, dirCount: dirs.length, depCount: deps.length, devDepCount: devDeps.length, productType },
    products: (catalog.products || []).length,
    rndSpecsGenerated: rndSpecs.length,
    artifactDir: OUTPUT_DIR
  };
  writeFileSync(DASH_PATH, JSON.stringify(dash, null, 2));

  console.log(`  ${totalFiles} source files analyzed across ${dirs.length} directories`);
  console.log(`  Product type: ${productType}`);
  console.log(`  Dependencies: ${deps.length} prod + ${devDeps.length} dev`);
  console.log(`  Catalog: ${(catalog.products || []).length} products`);
  console.log(`  R&D specs generated: ${rndSpecs.length} from INVEST pipeline`);
  if (rndSpecs.length > 0) {
    for (const s of rndSpecs) {
      console.log(`    - ${s.name}: ${s.investScore}/100 → $${s.spec.suggestedPriceMonthly}/mo (${s.spec.estimatedBuildWeeks}w)`);
    }
  }
  console.log(`\nArtifacts written:`);
  console.log(`  - ${join(OUTPUT_DIR, 'blueprint.md')}`);
  console.log(`  - ${join(OUTPUT_DIR, 'CHANGELOG.md')}`);
  console.log(`  - ${join(OUTPUT_DIR, 'package.json')}`);
  if (rndSpecs.length > 0) {
    console.log(`  - ${join(OUTPUT_DIR, 'rnd-product-specs.json')}`);
  }
}

main();
