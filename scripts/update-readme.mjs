#!/usr/bin/env node
/**
 * update-readme.mjs
 * Actualiza README/docs con métricas y novedades.
 * Inputs: repo, métricas, changelog
 * Output: README.md actualizado
 */

import fs from 'node:fs';
import path from 'node:path';

const [,, repo] = process.argv;
if (!repo) {
  console.error('Uso: update-readme.mjs <repo>');
  process.exit(1);
}

const START = '<!-- AUTO:README:START -->';
const END = '<!-- AUTO:README:END -->';

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function buildAutoBlock(repoRoot) {
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const gatePath = path.join(repoRoot, 'ops', 'runtime', 'production-go-no-go-report.json');

  const pkg = safeReadJson(packageJsonPath) || {};
  const gate = safeReadJson(gatePath);

  const scriptsCount = Object.keys(pkg.scripts || {}).length;
  const nodeEngine = pkg.engines?.node || 'no declarado';
  const gateStatus = gate?.gateStatus || 'sin reporte';
  const gatePass = gate?.summary?.pass ?? 0;
  const gateWarn = gate?.summary?.warn ?? 0;
  const gateFail = gate?.summary?.fail ?? 0;

  return [
    START,
    '## Estado Automático',
    `- Repo: ${repo}`,
    `- Ultima actualización: ${new Date().toISOString()}`,
    `- Node engine: ${nodeEngine}`,
    `- Scripts operativos: ${scriptsCount}`,
    `- Prod gate: ${gateStatus} (PASS ${gatePass} | WARN ${gateWarn} | FAIL ${gateFail})`,
    '- Nota: este bloque se genera con scripts/update-readme.mjs y puede regenerarse sin afectar secciones manuales.',
    END,
    ''
  ].join('\n');
}

function updateReadme(repoRoot) {
  const readmePath = path.join(repoRoot, 'README.md');
  if (!fs.existsSync(readmePath)) {
    throw new Error(`README.md no encontrado en: ${readmePath}`);
  }

  const original = fs.readFileSync(readmePath, 'utf8');
  const autoBlock = buildAutoBlock(repoRoot);
  const startIndex = original.indexOf(START);
  const endIndex = original.indexOf(END);

  let updated;
  if (startIndex >= 0 && endIndex > startIndex) {
    const afterEnd = original.slice(endIndex + END.length);
    updated = `${original.slice(0, startIndex)}${autoBlock}${afterEnd.replace(/^\r?\n/, '')}`;
  } else {
    updated = `${original.trimEnd()}\n\n${autoBlock}`;
  }

  fs.writeFileSync(readmePath, `${updated.trimEnd()}\n`, 'utf8');
}

try {
  const repoRoot = path.resolve(repo);
  updateReadme(repoRoot);
  console.log(`README actualizado para repo: ${repoRoot}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
