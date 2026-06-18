#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = process.argv.slice(2);
const strict = args.includes('--strict');
const withSocial = args.includes('--with-social');

function getArg(name) {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) return '';
  return args[idx + 1] || '';
}

const githubRepo = getArg('--githubRepo');
const githubEnv = getArg('--githubEnv');

const outDir = path.resolve('ops/runtime');
const outJson = path.join(outDir, 'production-trial-preflight.json');
const outMd = path.join(outDir, 'production-trial-preflight.md');

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32'
  });

  return {
    ok: result.status === 0,
    code: result.status ?? 1,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim()
  };
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function detectMissingEnv(keys) {
  const missing = [];
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value !== 'string' || value.trim().length === 0) {
      missing.push(key);
    }
  }
  return missing;
}

function step(id, title, severity, fn) {
  try {
    return { id, title, severity, ...fn() };
  } catch (error) {
    return {
      id,
      title,
      severity,
      status: 'FAIL',
      details: error instanceof Error ? error.message : String(error),
      evidence: [],
      ownerAction: 'Revisar error de ejecucion y reintentar.'
    };
  }
}

const checks = [];

checks.push(
  step('T1', 'Smoke tests', 'critical', () => {
    const result = run('npm', ['run', 'test:smoke']);
    return {
      status: result.ok ? 'PASS' : 'FAIL',
      details: result.ok ? 'test:smoke OK.' : 'test:smoke fallo.',
      evidence: ['npm run test:smoke'],
      ownerAction: result.ok ? 'Sin accion.' : 'Corregir pruebas de humo antes de produccion.'
    };
  })
);

checks.push(
  step('T2', 'Production gate', 'critical', () => {
    const result = run('npm', ['run', 'prod:gate']);
    const gateReport = readJsonSafe(path.resolve('ops/runtime/production-go-no-go-report.json'));
    const gateStatus = gateReport?.gateStatus || 'unknown';

    if (!result.ok) {
      return {
        status: 'FAIL',
        details: `prod:gate fallo (gateStatus=${gateStatus}).`,
        evidence: ['npm run prod:gate', 'ops/runtime/production-go-no-go-report.json'],
        ownerAction: 'Resolver checks de prod gate antes de pruebas productivas.'
      };
    }

    if (gateStatus !== 'GO') {
      return {
        status: gateStatus === 'GO_WITH_WARNINGS' ? 'WARN' : 'FAIL',
        details: `prod:gate finalizo con ${gateStatus}.`,
        evidence: ['ops/runtime/production-go-no-go-report.json'],
        ownerAction: 'Llevar gateStatus a GO para lanzamiento sin riesgo.'
      };
    }

    return {
      status: 'PASS',
      details: 'prod:gate en GO.',
      evidence: ['ops/runtime/production-go-no-go-report.json'],
      ownerAction: 'Sin accion.'
    };
  })
);

checks.push(
  step('T3', 'Billing reconciliation strict', 'critical', () => {
    const result = run('npm', ['run', 'billing:reconcile:strict']);
    const reconcileReport = readJsonSafe(path.resolve('ops/runtime/billing-reconciliation-report.json'));
    const mismatches = reconcileReport?.totals?.mismatchCount;

    return {
      status: result.ok ? 'PASS' : 'FAIL',
      details: result.ok
        ? `billing:reconcile:strict OK (mismatchCount=${mismatches ?? '0'}).`
        : `billing:reconcile:strict fallo (mismatchCount=${mismatches ?? 'unknown'}).`,
      evidence: ['npm run billing:reconcile:strict', 'ops/runtime/billing-reconciliation-report.json'],
      ownerAction: result.ok ? 'Sin accion.' : 'Corregir mismatches de pagos/invoices antes de venta real.'
    };
  })
);

checks.push(
  step('T4', 'Billing env precheck', 'high', () => {
    const required = [
      'STRIPE_SECRET_KEY',
      'PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET',
      'FACTURAMA_API_KEY',
      'FACTURAMA_API_SECRET',
      'RESEND_API_KEY'
    ];

    const missing = detectMissingEnv(required);
    if (missing.length === 0) {
      return {
        status: 'PASS',
        details: 'Billing env vars presentes en este entorno.',
        evidence: required,
        ownerAction: 'Sin accion.'
      };
    }

    return {
      status: 'WARN',
      details: `Faltan env vars locales: ${missing.join(', ')}`,
      evidence: required,
      ownerAction: 'Verificar que esten configuradas en entorno productivo antes de pruebas reales.'
    };
  })
);

if (withSocial) {
  checks.push(
    step('T5', 'Social channel secrets', 'high', () => {
      const socialArgs = ['scripts/traffic/check-social-ready.mjs'];
      if (githubRepo && githubEnv) {
        socialArgs.push('--githubRepo', githubRepo, '--githubEnv', githubEnv);
      }
      const result = run('node', socialArgs);
      return {
        status: result.ok ? 'PASS' : 'FAIL',
        details: result.ok ? 'Social channels READY.' : 'Uno o mas canales bloqueados por secretos faltantes.',
        evidence: ['node scripts/traffic/check-social-ready.mjs'],
        ownerAction: result.ok
          ? 'Sin accion.'
          : 'Completar secretos sociales para habilitar trafico multicanal en produccion.'
      };
    })
  );
}

const totals = checks.reduce(
  (acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  },
  { PASS: 0, WARN: 0, FAIL: 0 }
);

let gateStatus = 'GO';
if (totals.FAIL > 0) gateStatus = 'NO_GO';
else if (totals.WARN > 0) gateStatus = 'GO_WITH_WARNINGS';

const report = {
  generatedAt: new Date().toISOString(),
  mode: withSocial ? 'full' : 'core',
  strict,
  gateStatus,
  summary: {
    pass: totals.PASS,
    warn: totals.WARN,
    fail: totals.FAIL,
    total: checks.length
  },
  checks,
  ownerNextActions: checks.filter((c) => c.status !== 'PASS').map((c) => `${c.id}: ${c.ownerAction}`)
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(report, null, 2) + '\n', 'utf8');

const md = [
  '# Production Trial Preflight',
  '',
  `- generatedAt: ${report.generatedAt}`,
  `- mode: ${report.mode}`,
  `- strict: ${report.strict}`,
  `- gateStatus: ${report.gateStatus}`,
  `- summary: pass=${report.summary.pass} warn=${report.summary.warn} fail=${report.summary.fail} total=${report.summary.total}`,
  '',
  '## Checks',
  ...report.checks.flatMap((c) => [
    `### ${c.id} — ${c.title}`,
    `- severity: ${c.severity}`,
    `- status: ${c.status}`,
    `- details: ${c.details}`,
    `- ownerAction: ${c.ownerAction}`,
    ''
  ]),
  '## Owner Next Actions',
  ...(report.ownerNextActions.length > 0 ? report.ownerNextActions.map((a) => `- ${a}`) : ['- none'])
].join('\n');

fs.writeFileSync(outMd, md + '\n', 'utf8');

console.log(JSON.stringify(report, null, 2));

if (strict && gateStatus !== 'GO') {
  process.exit(1);
}

if (gateStatus === 'NO_GO') {
  process.exit(2);
}
