#!/usr/bin/env node
/**
 * scan-repos.mjs
 * Autonomous repo scanner + launch selector.
 *
 * Goals:
 * - Score user repositories with concrete technical/product signals.
 * - Read engine products from ops/catalog/products.json.
 * - Build a 4-product launch set (2 user repos + 2 engine products).
 * - Select top 2 launch focus with rule: 2 user repos mandatory.
 * - Exception: if one user repo underperforms against launch standard,
 *   allow benchmark replacement for that slot.
 *
 * Usage examples:
 * node scripts/scan-repos.mjs
 * node scripts/scan-repos.mjs --workspaceRoot ".."
 * node scripts/scan-repos.mjs --candidates "FacturAutentico,all-about-money,web_project_around_express,vmDevWeb"
 * node scripts/scan-repos.mjs --benchmark "stripe/invoicing"
 */

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_BENCHMARK = {
  id: 'benchmark/saas-b2b-reference',
  name: 'SaaS B2B Benchmark Reference',
  score: 86,
  notes: [
    'Referencia externa para estandar de UX, confiabilidad y go-to-market.',
    'Reemplazo permitido solo si un repo propio cae por debajo del umbral de lanzamiento.'
  ]
};

function parseArgs(argv) {
  const options = {
    workspaceRoot: path.resolve(process.cwd(), '..'),
    catalogPath: path.resolve(process.cwd(), 'ops/catalog/products.json'),
    outFile: path.resolve(process.cwd(), 'scan-results.json'),
    candidates: [],
    benchmark: { ...DEFAULT_BENCHMARK },
    minOwnQualityScore: 68,
    launchSetSize: 4
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      continue;
    }

    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      continue;
    }

    if (key === 'workspaceRoot') {
      options.workspaceRoot = path.resolve(next);
      index += 1;
      continue;
    }

    if (key === 'catalogPath') {
      options.catalogPath = path.resolve(next);
      index += 1;
      continue;
    }

    if (key === 'outFile') {
      options.outFile = path.resolve(next);
      index += 1;
      continue;
    }

    if (key === 'candidates') {
      options.candidates = next
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }

    if (key === 'benchmark') {
      options.benchmark.id = `benchmark/${normalizeSlug(next)}`;
      options.benchmark.name = next.trim();
      index += 1;
      continue;
    }

    if (key === 'benchmarkScore') {
      const parsed = Number(next);
      if (!Number.isNaN(parsed)) {
        options.benchmark.score = Math.max(0, Math.min(100, Math.round(parsed)));
      }
      index += 1;
      continue;
    }

    if (key === 'minOwnQualityScore') {
      const parsed = Number(next);
      if (!Number.isNaN(parsed)) {
        options.minOwnQualityScore = Math.max(0, Math.min(100, Math.round(parsed)));
      }
      index += 1;
    }
  }

  return options;
}

function normalizeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function safeReadJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function hasFile(filePath) {
  return fs.existsSync(filePath);
}

function listDirectories(rootDir) {
  return fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.endsWith('.worktrees') && name !== 'node_modules');
}

function findTypeScriptSignal(repoPath) {
  return hasFile(path.join(repoPath, 'tsconfig.json'));
}

function findCiSignal(repoPath) {
  const workflows = path.join(repoPath, '.github/workflows');
  if (!hasFile(workflows)) {
    return 0;
  }

  try {
    return fs.readdirSync(workflows).filter((item) => item.endsWith('.yml') || item.endsWith('.yaml')).length;
  } catch {
    return 0;
  }
}

function detectProductReadiness(readmeText) {
  const lower = String(readmeText || '').toLowerCase();
  let score = 0;

  if (lower.includes('deploy') || lower.includes('production')) {
    score += 1;
  }
  if (lower.includes('api') || lower.includes('saas') || lower.includes('billing')) {
    score += 1;
  }
  if (lower.includes('roadmap') || lower.includes('architecture')) {
    score += 1;
  }

  return score;
}

function analyzeRepo(workspaceRoot, repoName) {
  const repoPath = path.join(workspaceRoot, repoName);
  const packageJsonPath = path.join(repoPath, 'package.json');
  const readmePath = path.join(repoPath, 'README.md');
  const licensePath = path.join(repoPath, 'LICENSE');

  const packageJson = safeReadJson(packageJsonPath, {});
  const scripts = packageJson.scripts || {};
  const readme = hasFile(readmePath) ? fs.readFileSync(readmePath, 'utf8') : '';

  const signals = {
    hasPackageJson: hasFile(packageJsonPath),
    hasReadme: hasFile(readmePath),
    hasLicense: hasFile(licensePath),
    hasTestScript: typeof scripts.test === 'string' && scripts.test.trim().length > 0,
    hasBuildScript: typeof scripts.build === 'string' && scripts.build.trim().length > 0,
    hasLintScript: typeof scripts.lint === 'string' && scripts.lint.trim().length > 0,
    hasTypeScript: findTypeScriptSignal(repoPath),
    hasServerEntry: hasFile(path.join(repoPath, 'server.js')) || hasFile(path.join(repoPath, 'app.js')),
    ciWorkflows: findCiSignal(repoPath),
    docsReadiness: detectProductReadiness(readme)
  };

  let score = 0;
  score += signals.hasPackageJson ? 8 : 0;
  score += signals.hasReadme ? 12 : 0;
  score += signals.hasLicense ? 5 : 0;
  score += signals.hasTestScript ? 20 : 0;
  score += signals.hasBuildScript ? 15 : 0;
  score += signals.hasLintScript ? 10 : 0;
  score += signals.hasTypeScript ? 8 : 0;
  score += signals.hasServerEntry ? 7 : 0;
  score += Math.min(8, signals.ciWorkflows * 2);
  score += Math.min(7, signals.docsReadiness * 2);

  const opportunities = [];
  if (!signals.hasTestScript) {
    opportunities.push('Agregar script de test para confiabilidad continua.');
  }
  if (!signals.hasBuildScript) {
    opportunities.push('Agregar pipeline de build para deploy repetible.');
  }
  if (!signals.hasLintScript) {
    opportunities.push('Agregar lint para evitar regresiones de calidad.');
  }
  if (!signals.hasReadme) {
    opportunities.push('Agregar README con propuesta de valor y guia de operacion.');
  }
  if (signals.ciWorkflows === 0) {
    opportunities.push('Agregar al menos un workflow CI para validacion automatica.');
  }

  return {
    repo: repoName,
    path: repoPath,
    score: Math.max(0, Math.min(100, Math.round(score))),
    signals,
    opportunities
  };
}

function loadEngineProducts(catalogPath) {
  const payload = safeReadJson(catalogPath, { products: [] });
  const list = Array.isArray(payload.products) ? payload.products : [];

  return list.map((item) => {
    const statusBoost = item.status === 'active' ? 10 : item.status === 'planned' ? 2 : 0;
    const planBoost = Array.isArray(item.planIds) ? Math.min(8, item.planIds.length * 3) : 0;

    return {
      id: item.id,
      name: item.name,
      status: item.status,
      planIds: item.planIds || [],
      score: Math.min(100, 62 + statusBoost + planBoost)
    };
  });
}

function selectLaunchSet(repoAnalysis, engineProducts, launchSetSize) {
  const sortedRepos = [...repoAnalysis].sort((a, b) => b.score - a.score);
  const sortedEngine = [...engineProducts]
    .filter((item) => item.status === 'active' || item.status === 'planned')
    .sort((a, b) => b.score - a.score);

  const ownSelected = sortedRepos.slice(0, 2);
  const engineSelected = sortedEngine.slice(0, Math.max(0, launchSetSize - ownSelected.length));

  return {
    ownSelected,
    engineSelected
  };
}

function computeTop2Focus(ownSelected, launchSet, benchmark, minOwnQualityScore) {
  const launchScores = launchSet.map((item) => item.score).sort((a, b) => b - a);
  const launchMedian = launchScores.length > 0 ? launchScores[Math.floor(launchScores.length / 2)] : 0;

  const sortedOwn = [...ownSelected].sort((a, b) => b.score - a.score);
  const baseTop2 = sortedOwn.slice(0, 2).map((item) => ({
    id: item.repo,
    name: item.repo,
    source: 'user-repo',
    score: item.score,
    status: 'selected'
  }));

  if (baseTop2.length < 2) {
    return {
      top2: baseTop2,
      benchmarkUsed: false,
      rationale:
        'No hay suficientes repos propios evaluables para aplicar regla de 2 propios obligatorios.'
    };
  }

  const weakestOwn = baseTop2[1];
  const underAbsoluteThreshold = weakestOwn.score < minOwnQualityScore;
  const underLaunchBand = weakestOwn.score + 4 < launchMedian;

  if (underAbsoluteThreshold && underLaunchBand) {
    const replaced = [
      baseTop2[0],
      {
        id: benchmark.id,
        name: benchmark.name,
        source: 'benchmark',
        score: benchmark.score,
        status: 'replacement'
      }
    ];

    return {
      top2: replaced,
      benchmarkUsed: true,
      rationale:
        'Se activo excepcion benchmark: el segundo repo propio quedo por debajo del estandar minimo frente al set de lanzamiento.'
    };
  }

  return {
    top2: baseTop2,
    benchmarkUsed: false,
    rationale: 'Se mantiene regla de 2 repos propios obligatorios en top final.'
  };
}

function buildHardeningPlan(repoAnalysis) {
  return repoAnalysis
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((repo) => ({
      repo: repo.repo,
      score: repo.score,
      actions: [
        'Agregar o reforzar pruebas de humo para rutas criticas de monetizacion.',
        'Definir dashboard minimo de conversion (visit->lead->close).',
        'Ajustar oferta y CTA principal con una sola accion de cierre.',
        ...repo.opportunities.slice(0, 2)
      ]
    }));
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  const allRepoDirs = listDirectories(options.workspaceRoot);
  const candidateRepos =
    options.candidates.length > 0
      ? options.candidates
      : allRepoDirs.filter((name) => hasFile(path.join(options.workspaceRoot, name, 'package.json')));

  const repoAnalysis = candidateRepos.map((repoName) => analyzeRepo(options.workspaceRoot, repoName));
  const engineProducts = loadEngineProducts(options.catalogPath);
  const launchSelection = selectLaunchSet(repoAnalysis, engineProducts, options.launchSetSize);

  const launchSet = [
    ...launchSelection.ownSelected.map((item) => ({ id: item.repo, source: 'user-repo', score: item.score })),
    ...launchSelection.engineSelected.map((item) => ({ id: item.id, source: 'engine-product', score: item.score }))
  ];

  const top2Decision = computeTop2Focus(
    launchSelection.ownSelected,
    launchSet,
    options.benchmark,
    options.minOwnQualityScore
  );

  const summary = {
    generatedAt: new Date().toISOString(),
    workspaceRoot: options.workspaceRoot,
    policy: {
      ownMandatoryTop2: 2,
      benchmarkFallbackEnabled: true,
      minOwnQualityScore: options.minOwnQualityScore
    },
    benchmark: options.benchmark,
    analyzed: {
      repoCount: repoAnalysis.length,
      engineProductCount: engineProducts.length
    },
    launchSelection: {
      ownCandidates: launchSelection.ownSelected,
      engineCandidates: launchSelection.engineSelected,
      top2Decision
    },
    hardeningPlan: buildHardeningPlan(repoAnalysis),
    repoAnalysis,
    engineProducts
  };

  fs.writeFileSync(options.outFile, `${JSON.stringify(summary, null, 2)}\n`);

  process.stdout.write('Autonomous scan completed.\n');
  process.stdout.write(`Output: ${options.outFile}\n`);
  process.stdout.write(`Analyzed repos: ${summary.analyzed.repoCount}\n`);
  process.stdout.write(`Launch top2 rationale: ${summary.launchSelection.top2Decision.rationale}\n`);
}

main();
