#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildStructuralChecks, generateReport, formatMarkdown } from '../engine/runtime/production-gate.mjs';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const runChecks = !process.argv.includes('--no-commands');
const noCommandsFail = (evidence, action) => ({
  status: 'FAIL',
  details: 'Modo no permitido para release: --no-commands desactiva validaciones criticas.',
  evidence,
  ownerAction: action
});
const sh = (cmd, args) => { const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' }); return { ok: r.status === 0, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() }; };
const ac = (arr, id, title, sev, fn) => { try { const r = fn(); arr.push({ id, title, severity: sev, ...r }); } catch(e) { arr.push({ id, title, severity: sev, status: 'FAIL', details: e.message, evidence: [], ownerAction: 'Revisar stacktrace.' }); } };

const checks = buildStructuralChecks(root);

ac(checks, 'P8', 'Pruebas criticas de humo', 'critical', () => {
  if (!runChecks) return noCommandsFail(['npm run test:smoke'], 'Ejecutar test:smoke sin --no-commands.');
  const r = sh('npm', ['run','test:smoke']);
  return { status: r.ok ? 'PASS' : 'FAIL', details: r.ok ? 'test:smoke OK.' : 'test:smoke fallo.', evidence: ['npm run test:smoke'], ownerAction: r.ok ? 'Sin accion.' : 'Corregir pruebas.' };
});

ac(checks, 'P9', 'Build de backend y arranque', 'critical', () => {
  if (!runChecks) return noCommandsFail(['npm run build:server'], 'Ejecutar build:server sin --no-commands.');
  const r = sh('npm', ['run','build:server']);
  return { status: r.ok ? 'PASS' : 'FAIL', details: r.ok ? 'build:server OK.' : 'build:server fallo.', evidence: ['npm run build:server'], ownerAction: r.ok ? 'Sin accion.' : 'Corregir build.' };
});

ac(checks, 'P12', 'GitHub Actions operacional', 'critical', () => {
  const r = sh('gh', ['run','list','--workflow','ci.yml','--limit','3','--json','conclusion','--repo','Tigre-Labs/tiger-lab-private']);
  if (!r.ok) return { status: 'FAIL', details: 'gh CLI sin acceso al repo', evidence: [], ownerAction: 'Verificar gh CLI y GITHUB_TOKEN.' };
  const last = JSON.parse(r.stdout)[0]?.conclusion || 'unknown';
  return { status: last === 'success' ? 'PASS' : 'WARN', details: `CI: ${last}`, evidence: [], ownerAction: last === 'success' ? 'Sin accion.' : 'Revisar CI.' };
});

ac(checks, 'P14', 'Railway deploy status', 'high', () => {
  const r = sh('gh', ['run','list','--workflow','backend-railway-deploy.yml','--limit','1','--json','conclusion','--repo','Tigre-Labs/tiger-lab-private']);
  if (!r.ok) return { status: 'WARN', details: 'No se pudo consultar Railway deploy', evidence: ['.github/workflows/backend-railway-deploy.yml'], ownerAction: 'Verificar gh CLI.' };
  const last = JSON.parse(r.stdout)[0]?.conclusion || 'unknown';
  return { status: last === 'success' ? 'PASS' : 'WARN', details: `Railway: ${last}`, evidence: ['.github/workflows/backend-railway-deploy.yml'], ownerAction: last === 'success' ? 'Sin accion.' : 'Revisar Railway logs.' };
});

ac(checks, 'P16', 'Validacion de gobernanza de agentes', 'critical', () => {
  if (!runChecks) return noCommandsFail(['npm run check:copilot:agents'], 'Ejecutar check:copilot:agents sin --no-commands.');
  const r = sh('npm', ['run', 'check:copilot:agents']);
  return {
    status: r.ok ? 'PASS' : 'FAIL',
    details: r.ok ? 'check:copilot:agents OK.' : 'check:copilot:agents fallo.',
    evidence: ['npm run check:copilot:agents'],
    ownerAction: r.ok ? 'Sin accion.' : 'Corregir definiciones YAML de agentes antes de release.'
  };
});

ac(checks, 'P19', 'Smoke publico del dashboard de produccion', 'critical', () => {
  if (!runChecks) return noCommandsFail(['npm run prod:dashboard:smoke'], 'Ejecutar prod:dashboard:smoke sin --no-commands.');
  const r = sh('npm', ['run', 'prod:dashboard:smoke']);
  return {
    status: r.ok ? 'PASS' : 'FAIL',
    details: r.ok ? 'prod:dashboard:smoke OK.' : 'prod:dashboard:smoke fallo.',
    evidence: ['npm run prod:dashboard:smoke'],
    ownerAction: r.ok ? 'Sin accion.' : 'Corregir el dashboard de produccion antes de release.'
  };
});

ac(checks, 'P20', 'Alineacion index runtime vs 50-published', 'critical', () => {
  if (!runChecks) return noCommandsFail(['npm run campaigns:index:check'], 'Ejecutar campaigns:index:check sin --no-commands.');
  const r = sh('npm', ['run', 'campaigns:index:check']);
  return {
    status: r.ok ? 'PASS' : 'FAIL',
    details: r.ok ? 'campaigns:index:check OK.' : 'campaigns:index:check fallo.',
    evidence: ['npm run campaigns:index:check'],
    ownerAction: r.ok ? 'Sin accion.' : 'Ejecutar campaigns:index:sync o corregir flujo de publicacion para alinear runtime index.'
  };
});

ac(checks, 'P21', 'Reconciliacion fiscal obligatoria (MATCH)', 'critical', () => {
  if (!runChecks) return noCommandsFail(['npm run billing:reconcile:strict'], 'Ejecutar billing:reconcile:strict sin --no-commands.');
  const r = sh('npm', ['run', 'billing:reconcile:strict']);
  let billingStatus = 'UNKNOWN';
  try {
    const reportPath = path.join(root, 'ops', 'runtime', 'billing-reconciliation-report.json');
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      billingStatus = String(report?.status || 'UNKNOWN').trim().toUpperCase();
    }
  } catch {
    // Best effort parse.
  }

  const failDetails = billingStatus === 'MISMATCH'
    ? 'billing:reconcile:strict fallo (MISMATCH).'
    : billingStatus === 'UNKNOWN'
      ? 'billing:reconcile:strict fallo (UNKNOWN sin evidencia fiscal en scope real).'
      : `billing:reconcile:strict fallo (${billingStatus || 'UNKNOWN'}).`;

  const failOwnerAction = billingStatus === 'UNKNOWN'
    ? 'NO_GO obligatorio: publicar evidencia fiscal real en scope (no fixture) y obtener MATCH antes de release.'
    : 'NO_GO obligatorio: corregir CFDI/PAC y obtener MATCH antes de release.';

  return {
    status: r.ok ? 'PASS' : 'FAIL',
    details: r.ok ? 'billing:reconcile:strict OK (MATCH).' : failDetails,
    evidence: ['npm run billing:reconcile:strict', 'ops/runtime/billing-reconciliation-report.json', 'ops/runtime/billing-reconciliation-report.md'],
    ownerAction: r.ok ? 'Sin accion.' : failOwnerAction
  };
});

const report = generateReport(checks, strict);
const outDir = path.join(root, 'ops', 'runtime');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'production-go-no-go-report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'production-go-no-go-report.md'), formatMarkdown(report) + '\n');
console.log(JSON.stringify(report, null, 2));

if (strict && report.gateStatus !== 'GO') process.exit(1);
