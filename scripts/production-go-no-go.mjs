#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const runChecks = !process.argv.includes('--no-commands');

function p(...parts) {
  return path.join(root, ...parts);
}

function exists(relPath) {
  return fs.existsSync(p(relPath));
}

function readText(relPath) {
  return fs.readFileSync(p(relPath), 'utf8');
}

function readJson(relPath) {
  return JSON.parse(readText(relPath));
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return {
    ok: result.status === 0,
    code: result.status,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}

const checks = [];

function addCheck(id, title, severity, fn) {
  try {
    const result = fn();
    checks.push({ id, title, severity, ...result });
  } catch (error) {
    checks.push({
      id,
      title,
      severity,
      status: 'FAIL',
      details: error instanceof Error ? error.message : String(error),
      evidence: [],
      ownerAction: 'Revisar stacktrace y corregir antes de lanzamiento.',
    });
  }
}

addCheck('P1', 'Catalogo activo y consistente', 'critical', () => {
  const productsPath = 'ops/catalog/products.json';
  const plansPath = 'ops/catalog/plans.json';
  const manifestPath = 'ops/catalog/catalog-manifest.json';
  const products = readJson(productsPath).products || [];
  const activeProducts = products.filter((x) => x.status === 'active');
  const ok = exists(productsPath) && exists(plansPath) && exists(manifestPath) && activeProducts.length > 0;
  return {
    status: ok ? 'PASS' : 'FAIL',
    details: ok
      ? `Activos: ${activeProducts.length} productos.`
      : 'Falta catalogo/plans/manifest o no hay productos activos.',
    evidence: [productsPath, plansPath, manifestPath],
    ownerAction: ok ? 'Sin accion.' : 'Completar catalogo y activar al menos un producto.',
  };
});

addCheck('P2', 'Funnels y eventos trazables', 'critical', () => {
  const eventsPath = 'ops/runtime/funnel-events.jsonl';
  if (!exists(eventsPath)) {
    return {
      status: 'FAIL',
      details: 'No existe log de eventos.',
      evidence: [eventsPath],
      ownerAction: 'Habilitar persistencia de eventos antes de lanzar.',
    };
  }
  const data = readText(eventsPath).split(/\r?\n/).filter(Boolean);
  const types = new Set();
  for (const line of data.slice(0, 5000)) {
    try {
      const parsed = JSON.parse(line);
      if (parsed?.type) types.add(parsed.type);
    } catch {
      // ignore malformed lines
    }
  }
  const required = ['lead_captured', 'lead_scored', 'payment_succeeded', 'account_provisioned'];
  const missing = required.filter((t) => !types.has(t));
  return {
    status: missing.length === 0 ? 'PASS' : 'WARN',
    details: missing.length === 0 ? 'Eventos clave presentes.' : `Faltan eventos: ${missing.join(', ')}.`,
    evidence: [eventsPath],
    ownerAction: missing.length === 0 ? 'Sin accion.' : 'Ejecutar flujo completo para registrar eventos faltantes.',
  };
});

addCheck('P3', 'Pricing rules y politicas activas', 'critical', () => {
  const pricingPath = 'ops/catalog/pricing-rules.json';
  const rules = readJson(pricingPath).pricingRules || [];
  const enabled = rules.filter((r) => r.enabled === true).length;
  return {
    status: enabled > 0 ? 'PASS' : 'FAIL',
    details: enabled > 0 ? `Reglas activas: ${enabled}.` : 'No hay reglas de pricing habilitadas.',
    evidence: [pricingPath, 'PRICING_RULES.txt'],
    ownerAction: enabled > 0 ? 'Sin accion.' : 'Habilitar reglas de pricing antes de go-live.',
  };
});

addCheck('P4', 'Automatizaciones y secuencias operativas', 'high', () => {
  const seq = exists('AUTOMATION_SEQUENCES.txt');
  const aut = exists('AUTONOMY_MODE.txt');
  const routine = exists('DAILY_AUTONOMY_ROUTINE.txt');
  const runScript = exists('scripts/supervisor-sync-command-center.mjs');
  const ok = seq && aut && routine && runScript;
  return {
    status: ok ? 'PASS' : 'FAIL',
    details: ok ? 'Base de automatizacion presente.' : 'Faltan artefactos base de automatizacion.',
    evidence: ['AUTOMATION_SEQUENCES.txt', 'AUTONOMY_MODE.txt', 'DAILY_AUTONOMY_ROUTINE.txt', 'scripts/supervisor-sync-command-center.mjs'],
    ownerAction: ok ? 'Sin accion.' : 'Completar los artefactos faltantes.',
  };
});

addCheck('P5', 'Bots e integraciones base', 'high', () => {
  const required = [
    'bots/SalesBot.md',
    'bots/ContentBot.md',
    'bots/FAQBot.md',
    'bots/ProvisionBot.md',
    'bots/engine/BotOrchestrator.ts',
    'bots/engine/BotRouter.ts',
  ];
  const missing = required.filter((f) => !exists(f));
  return {
    status: missing.length === 0 ? 'PASS' : 'FAIL',
    details: missing.length === 0 ? 'Bots base presentes.' : `Faltan: ${missing.join(', ')}.`,
    evidence: required,
    ownerAction: missing.length === 0 ? 'Sin accion.' : 'Completar bots e integraciones faltantes.',
  };
});

addCheck('P6', 'Contenido y publicacion automatizada', 'high', () => {
  const required = ['scripts/generate-content.mjs', 'scripts/publish-content.mjs', 'ops/traffic/SOCIAL_PUBLICATION_STRUCTURE.md'];
  const missing = required.filter((f) => !exists(f));
  return {
    status: missing.length === 0 ? 'PASS' : 'FAIL',
    details: missing.length === 0 ? 'Pipeline de contenido presente.' : `Faltan: ${missing.join(', ')}.`,
    evidence: required,
    ownerAction: missing.length === 0 ? 'Sin accion.' : 'Completar pipeline de contenido.',
  };
});

addCheck('P7', 'Traffic multicanal preparado', 'high', () => {
  const required = [
    'scripts/traffic/check-social-ready.mjs',
    'scripts/traffic/generate-social-pack.mjs',
    'scripts/traffic/publish-social-pack.mjs',
    'scripts/traffic/check-go-live.mjs',
  ];
  const missing = required.filter((f) => !exists(f));
  const status = missing.length === 0 ? 'PASS' : 'FAIL';
  return {
    status,
    details: status === 'PASS' ? 'Scripts multicanal listos.' : `Faltan: ${missing.join(', ')}.`,
    evidence: required,
    ownerAction: status === 'PASS' ? 'Validar tokens/secretos por canal.' : 'Completar scripts de trafico faltantes.',
  };
});

addCheck('P8', 'Pruebas criticas de humo', 'critical', () => {
  if (!runChecks) {
    return {
      status: 'WARN',
      details: 'No se ejecutaron comandos (modo --no-commands).',
      evidence: ['npm run test:smoke'],
      ownerAction: 'Ejecutar test:smoke antes de lanzamiento.',
    };
  }
  const result = runCommand('npm', ['run', 'test:smoke']);
  return {
    status: result.ok ? 'PASS' : 'FAIL',
    details: result.ok ? 'test:smoke aprobado.' : 'test:smoke fallo.',
    evidence: ['npm run test:smoke'],
    ownerAction: result.ok ? 'Sin accion.' : 'Corregir pruebas de humo.',
  };
});

addCheck('P9', 'Build de backend y arranque', 'critical', () => {
  if (!runChecks) {
    return {
      status: 'WARN',
      details: 'No se ejecutaron comandos (modo --no-commands).',
      evidence: ['npm run build:server'],
      ownerAction: 'Ejecutar build:server antes de lanzamiento.',
    };
  }
  const result = runCommand('npm', ['run', 'build:server']);
  return {
    status: result.ok ? 'PASS' : 'FAIL',
    details: result.ok ? 'build:server aprobado.' : 'build:server fallo.',
    evidence: ['npm run build:server'],
    ownerAction: result.ok ? 'Sin accion.' : 'Corregir errores de compilacion backend.',
  };
});

addCheck('P10', 'Gobernanza de produccion y tiggreeeon', 'critical', () => {
  const required = [
    '.github/copilot/agents/agent-tiggreeeon.yaml',
    '.github/copilot/agents/agent-master.yaml',
    'scripts/validate-copilot-agents.mjs',
    'PROJECT_BLUEPRINT_TOTAL.txt',
    'LAUNCH_CHECKLIST.txt',
    'LAUNCH_PLAN_24H.txt',
  ];
  const missing = required.filter((f) => !exists(f));
  let watchOnlyOk = false;
  if (exists('.github/copilot/agents/agent-tiggreeeon.yaml')) {
    const y = readText('.github/copilot/agents/agent-tiggreeeon.yaml');
    watchOnlyOk =
      y.includes('watch_only: true') &&
      y.includes('allow_file_editing: false') &&
      y.includes('allow_code_generation: false') &&
      y.includes('allow_pull_request_creation: false');
  }
  const ok = missing.length === 0 && watchOnlyOk;
  return {
    status: ok ? 'PASS' : 'FAIL',
    details: ok ? 'Gobernanza y guardrails tiggreeeon activos.' : 'Faltan archivos de gobernanza o lock tiggreeeon.',
    evidence: required,
    ownerAction: ok ? 'Sin accion.' : 'Reparar guardrails antes de go-live.',
  };
});

addCheck('P11', 'Hardening de seguridad y checkout', 'critical', () => {
  const authPath = 'server/http/middleware/auth-middleware.ts';
  const billingPath = 'server/http/controllers/BillingController.ts';
  const uiStorePath = 'ui-host/src/state/uiStore.ts';

  const authText = readText(authPath);
  const billingText = readText(billingPath);
  const uiText = readText(uiStorePath);

  const authRequiresEnv = authText.includes('API_KEY_REGISTRY') && authText.includes("NODE_ENV === 'production'");
  const noExampleFallback = !billingText.includes('example.com/checkout/success') && !billingText.includes('example.com/checkout/cancel');
  const uiNoHardcodedHeader = !uiText.includes("'x-api-key': 'dev-public-key'");

  const ok = authRequiresEnv && noExampleFallback && uiNoHardcodedHeader;

  return {
    status: ok ? 'PASS' : 'FAIL',
    details: ok
      ? 'Hardening clave de auth y checkout activo.'
      : 'Faltan guardrails en auth/checkout o persiste hardcode de API key en UI.',
    evidence: [authPath, billingPath, uiStorePath],
    ownerAction: ok ? 'Sin accion.' : 'Corregir hardening antes de go-live.'
  };
});

const failCount = checks.filter((c) => c.status === 'FAIL').length;
const warnCount = checks.filter((c) => c.status === 'WARN').length;
const passCount = checks.filter((c) => c.status === 'PASS').length;

const gateStatus = failCount > 0 ? 'NO_GO' : warnCount > 0 ? 'GO_WITH_WARNINGS' : 'GO';

const report = {
  generatedAt: new Date().toISOString(),
  strict,
  gateStatus,
  summary: {
    pass: passCount,
    warn: warnCount,
    fail: failCount,
  },
  checks,
  ownerNextActions: checks
    .filter((c) => c.status !== 'PASS')
    .map((c) => ({ id: c.id, action: c.ownerAction })),
};

const outputJson = p('ops', 'runtime', 'production-go-no-go-report.json');
const outputMd = p('ops', 'runtime', 'production-go-no-go-report.md');

fs.mkdirSync(path.dirname(outputJson), { recursive: true });
fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);

const mdLines = [];
mdLines.push('# Production Go/No-Go Report');
mdLines.push('');
mdLines.push(`- generatedAt: ${report.generatedAt}`);
mdLines.push(`- gateStatus: ${report.gateStatus}`);
mdLines.push(`- summary: PASS ${passCount} | WARN ${warnCount} | FAIL ${failCount}`);
mdLines.push('');
mdLines.push('## Checks');
mdLines.push('');
for (const c of checks) {
  mdLines.push(`- ${c.id} ${c.title}: ${c.status}`);
  mdLines.push(`  details: ${c.details}`);
  mdLines.push(`  ownerAction: ${c.ownerAction}`);
}
mdLines.push('');
mdLines.push('## Owner Next Actions');
mdLines.push('');
if (report.ownerNextActions.length === 0) {
  mdLines.push('- Ninguna.');
} else {
  for (const a of report.ownerNextActions) {
    mdLines.push(`- ${a.id}: ${a.action}`);
  }
}
fs.writeFileSync(outputMd, `${mdLines.join('\n')}\n`);

console.log(JSON.stringify(report, null, 2));

if (strict && gateStatus !== 'GO') {
  process.exit(1);
}
