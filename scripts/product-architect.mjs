import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');
const SERVER = join(ROOT, 'server');
const SHARED = join(ROOT, 'shared');
const BOTS = join(ROOT, 'bots');
const PKG = join(ROOT, 'package.json');
const OUTPUT_DIR = join(ROOT, 'ops', 'artifacts');

function main() {
  console.log('ProductArchitect — analyzing repo and generating artifacts...\n');

  // --- 1. Repo Analysis ---
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

  // --- 2. Blueprint ---
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

## Improvements

1. Add integration tests (high priority)
2. Add request validation schemas (medium)
3. Add CI caching for faster builds (low)
`;

  // --- 3. Changelog ---
  const changelog = `# Changelog

All notable changes to this project will be documented in this file.

## [${appVersion}] - ${new Date().toISOString().split('T')[0]}

### Added
- Stripe payment service with checkout, webhook, and signature verification
- PayPal payment service as fallback provider
- Lead intelligence pipeline with ICP config, outreach generation
- Social landing pages for 5 products × 5 channels
- Agent monitor scanning 20 agents across project
- Verification supervisor with 24 system checks
- Unified dashboard in ops/command-center/

### Changed
- Dashboard server root to ops/ for broader data access
- Payment routing to support dual provider (Stripe default, PayPal fallback)

### Fixed
- Dashboard fetch paths for unified data loading

### Security
- Payment signature verification for Stripe webhooks
- Auth middleware for billing routes
`;

  // --- 4. Package.json artifact update ---
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

  // --- Write outputs ---
  mkdirSync(OUTPUT_DIR, { recursive: true });

  writeFileSync(join(OUTPUT_DIR, 'blueprint.md'), blueprint, 'utf-8');
  writeFileSync(join(OUTPUT_DIR, 'CHANGELOG.md'), changelog, 'utf-8');
  writeFileSync(join(OUTPUT_DIR, 'package.json'), JSON.stringify(artifactPkg, null, 2), 'utf-8');

  console.log(`  ${totalFiles} source files analyzed across ${dirs.length} directories`);
  console.log(`  Product type: ${productType}`);
  console.log(`  Dependencies: ${deps.length} prod + ${devDeps.length} dev`);
  console.log(`\nArtifacts written:`);
  console.log(`  - ${join(OUTPUT_DIR, 'blueprint.md')}`);
  console.log(`  - ${join(OUTPUT_DIR, 'CHANGELOG.md')}`);
  console.log(`  - ${join(OUTPUT_DIR, 'package.json')}`);
}

main();
