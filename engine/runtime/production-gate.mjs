/**
 * Production Gate — engine/runtime/production-gate.mjs
 * Pure business logic: structural checks, gate computation, report generation.
 * Zero GitHub or npm dependencies. Command-based checks (P8, P9, P12, P14)
 * must be added by the wrapper.
 */

import fs from 'node:fs';
import path from 'node:path';

function p(root, ...parts) { return path.join(root, ...parts); }
function exists(root, relPath) { return fs.existsSync(p(root, relPath)); }
function readText(root, relPath) { return fs.readFileSync(p(root, relPath), 'utf8'); }
function readJson(root, relPath) { return JSON.parse(readText(root, relPath)); }

function countPatternMatches(root, relPath, patterns) {
  if (!exists(root, relPath)) return { file: relPath, matches: 0 };
  const text = readText(root, relPath);
  const matchCount = patterns.reduce((total, pattern) => {
    const found = text.match(pattern);
    return total + (found ? found.length : 0);
  }, 0);
  return { file: relPath, matches: matchCount };
}

export function buildStructuralChecks(rootPath) {
  const checks = [];

  function addCheck(id, title, severity, fn) {
    try {
      const result = fn();
      checks.push({ id, title, severity, ...result });
    } catch (error) {
      checks.push({
        id, title, severity,
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
    const products = readJson(rootPath, productsPath).products || [];
    const activeProducts = products.filter((x) => x.status === 'active');
    const ok = exists(rootPath, productsPath) && exists(rootPath, plansPath) && exists(rootPath, manifestPath) && activeProducts.length > 0;
    return {
      status: ok ? 'PASS' : 'FAIL',
      details: ok ? `Activos: ${activeProducts.length} productos.` : 'Falta catalogo/plans/manifest o no hay productos activos.',
      evidence: [productsPath, plansPath, manifestPath],
      ownerAction: ok ? 'Sin accion.' : 'Completar catalogo y activar al menos un producto.',
    };
  });

  addCheck('P2', 'Funnels y eventos trazables', 'critical', () => {
    const eventsPath = 'ops/runtime/funnel-events.jsonl';
    if (!exists(rootPath, eventsPath)) {
      return {
        status: 'FAIL', details: 'No existe log de eventos.', evidence: [eventsPath],
        ownerAction: 'Habilitar persistencia de eventos antes de lanzar.',
      };
    }
    const data = readText(rootPath, eventsPath).split(/\r?\n/).filter(Boolean);
    const types = new Set();
    for (const line of data.slice(0, 5000)) {
      try { const parsed = JSON.parse(line); if (parsed?.type) types.add(parsed.type); } catch { /* ignore */ }
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
    const rules = readJson(rootPath, pricingPath).pricingRules || [];
    const enabled = rules.filter((r) => r.enabled === true).length;
    return {
      status: enabled > 0 ? 'PASS' : 'FAIL',
      details: enabled > 0 ? `Reglas activas: ${enabled}.` : 'No hay reglas de pricing habilitadas.',
      evidence: [pricingPath, 'PRICING_RULES.txt'],
      ownerAction: enabled > 0 ? 'Sin accion.' : 'Habilitar reglas de pricing antes de go-live.',
    };
  });

  addCheck('P4', 'Automatizaciones y secuencias operativas', 'high', () => {
    const seq = exists(rootPath, 'AUTOMATION_SEQUENCES.txt');
    const aut = exists(rootPath, 'AUTONOMY_MODE.txt');
    const routine = exists(rootPath, 'DAILY_AUTONOMY_ROUTINE.txt');
    const runScript = exists(rootPath, 'scripts/supervisor-sync-command-center.mjs');
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
      'bots/SalesBot.md', 'bots/ContentBot.md', 'bots/FAQBot.md', 'bots/ProvisionBot.md',
      'bots/engine/BotOrchestrator.ts', 'bots/engine/BotRouter.ts',
    ];
    const missing = required.filter((f) => !exists(rootPath, f));
    return {
      status: missing.length === 0 ? 'PASS' : 'FAIL',
      details: missing.length === 0 ? 'Bots base presentes.' : `Faltan: ${missing.join(', ')}.`,
      evidence: required,
      ownerAction: missing.length === 0 ? 'Sin accion.' : 'Completar bots e integraciones faltantes.',
    };
  });

  addCheck('P6', 'Contenido y publicacion automatizada', 'high', () => {
    const required = ['scripts/generate-content.mjs', 'scripts/publish-content.mjs', 'ops/traffic/SOCIAL_PUBLICATION_STRUCTURE.md'];
    const missing = required.filter((f) => !exists(rootPath, f));
    return {
      status: missing.length === 0 ? 'PASS' : 'FAIL',
      details: missing.length === 0 ? 'Pipeline de contenido presente.' : `Faltan: ${missing.join(', ')}.`,
      evidence: required,
      ownerAction: missing.length === 0 ? 'Sin accion.' : 'Completar pipeline de contenido.',
    };
  });

  addCheck('P7', 'Traffic multicanal preparado', 'high', () => {
    const required = [
      'scripts/traffic/check-social-ready.mjs', 'scripts/traffic/generate-social-pack.mjs',
      'scripts/traffic/publish-social-pack.mjs', 'scripts/traffic/check-go-live.mjs',
    ];
    const missing = required.filter((f) => !exists(rootPath, f));
    return {
      status: missing.length === 0 ? 'PASS' : 'FAIL',
      details: missing.length === 0 ? 'Scripts multicanal listos.' : `Faltan: ${missing.join(', ')}.`,
      evidence: required,
      ownerAction: missing.length === 0 ? 'Validar tokens/secretos por canal.' : 'Completar scripts de trafico faltantes.',
    };
  });

  addCheck('P10', 'Gobernanza de produccion y tiggreeeon', 'critical', () => {
    const required = [
      '.github/copilot/agents/agent-tiggreeeon.yaml', '.github/copilot/agents/agent-master.yaml',
      'scripts/validate-copilot-agents.mjs', 'PROJECT_BLUEPRINT_TOTAL.txt',
      'LAUNCH_CHECKLIST.txt', 'LAUNCH_PLAN_24H.txt',
    ];
    const missing = required.filter((f) => !exists(rootPath, f));
    let watchOnlyOk = false;
    if (exists(rootPath, '.github/copilot/agents/agent-tiggreeeon.yaml')) {
      const y = readText(rootPath, '.github/copilot/agents/agent-tiggreeeon.yaml');
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

    const authText = readText(rootPath, authPath);
    const billingText = readText(rootPath, billingPath);
    const uiText = readText(rootPath, uiStorePath);

    const authRequiresEnv = authText.includes('API_KEY_REGISTRY') && authText.includes("NODE_ENV === 'production'");
    const noExampleFallback = !billingText.includes('example.com/checkout/success') && !billingText.includes('example.com/checkout/cancel');
    const uiNoHardcodedHeader = !uiText.includes("'x-api-key': 'dev-public-key'");

    const ok = authRequiresEnv && noExampleFallback && uiNoHardcodedHeader;
    return {
      status: ok ? 'PASS' : 'FAIL',
      details: ok ? 'Hardening clave de auth y checkout activo.' : 'Faltan guardrails en auth/checkout o persiste hardcode de API key en UI.',
      evidence: [authPath, billingPath, uiStorePath],
      ownerAction: ok ? 'Sin accion.' : 'Corregir hardening antes de go-live.'
    };
  });

  addCheck('P13', 'Test coverage thresholds', 'high', () => {
    const vc = readText(rootPath, 'vitest.config.ts');
    const lineMatch = vc.match(/lines:\s*(\d+)/);
    const stmtMatch = vc.match(/statements:\s*(\d+)/);
    const linesThreshold = lineMatch ? parseInt(lineMatch[1]) : 0;
    const stmtThreshold = stmtMatch ? parseInt(stmtMatch[1]) : 0;
    const ok = linesThreshold >= 30 && stmtThreshold >= 30;
    return {
      status: ok ? 'PASS' : 'WARN',
      details: ok ? `Thresholds: lines ${linesThreshold}%, statements ${stmtThreshold}%` : `Thresholds muy bajos: lines ${linesThreshold}%, stmts ${stmtThreshold}%`,
      evidence: ['vitest.config.ts'],
      ownerAction: ok ? 'Sin accion.' : 'Revisar thresholds en vitest.config.ts.'
    };
  });

  addCheck('P15', 'Integridad de evidencia runtime (sin placeholders/samples)', 'critical', () => {
    const targets = [
      'ops/runtime/funnel-events.jsonl',
      'ops/runtime/runtime-state.json',
      'ops/runtime/invoice-pending-report.json',
      'ops/runtime/billing-reconciliation-report.json',
      'ops/runtime/billing-reconciliation-report.md',
      'ops/traffic/outbox/social-pack-landing-social.json',
    ];

    const placeholderPatterns = [/example\.com/gi, /placeholder/gi];
    const samplePatterns = [/pay_sample_/gi, /cust_sample_/gi];
    const allPatterns = [...placeholderPatterns, ...samplePatterns];

    const findings = targets.map((target) => countPatternMatches(rootPath, target, allPatterns));
    const offenders = findings.filter((f) => f.matches > 0);
    const totalMatches = offenders.reduce((sum, f) => sum + f.matches, 0);

    return {
      status: totalMatches === 0 ? 'PASS' : 'FAIL',
      details: totalMatches === 0
        ? 'No se detectaron placeholders ni IDs sample en evidencia operativa.'
        : `Se detectaron ${totalMatches} matches en ${offenders.length} archivos de evidencia runtime.`,
      evidence: targets,
      ownerAction: totalMatches === 0
        ? 'Sin accion.'
        : 'Eliminar placeholders/IDs sample en runtime y regenerar evidencia real antes de go-live.',
    };
  });

  return checks;
}

export function computeGate(checks) {
  const failCount = checks.filter((c) => c.status === 'FAIL').length;
  const warnCount = checks.filter((c) => c.status === 'WARN').length;
  const passCount = checks.filter((c) => c.status === 'PASS').length;
  const gateStatus = failCount > 0 ? 'NO_GO' : warnCount > 0 ? 'GO_WITH_WARNINGS' : 'GO';
  return { failCount, warnCount, passCount, gateStatus };
}

export function generateReport(checks, strict) {
  const gate = computeGate(checks);
  return {
    generatedAt: new Date().toISOString(),
    strict,
    gateStatus: gate.gateStatus,
    summary: { pass: gate.passCount, warn: gate.warnCount, fail: gate.failCount },
    checks,
    ownerNextActions: checks
      .filter((c) => c.status !== 'PASS')
      .map((c) => ({ id: c.id, action: c.ownerAction })),
  };
}

export function formatMarkdown(report) {
  const lines = [];
  lines.push('# Production Go/No-Go Report');
  lines.push('');
  lines.push(`- generatedAt: ${report.generatedAt}`);
  lines.push(`- gateStatus: ${report.gateStatus}`);
  lines.push(`- summary: PASS ${report.summary.pass} | WARN ${report.summary.warn} | FAIL ${report.summary.fail}`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  for (const c of report.checks) {
    lines.push(`- ${c.id} ${c.title}: ${c.status}`);
    lines.push(`  details: ${c.details}`);
    lines.push(`  ownerAction: ${c.ownerAction}`);
  }
  lines.push('');
  lines.push('## Owner Next Actions');
  lines.push('');
  if (report.ownerNextActions.length === 0) {
    lines.push('- Ninguna.');
  } else {
    for (const a of report.ownerNextActions) lines.push(`- ${a.id}: ${a.action}`);
  }
  return lines.join('\n');
}
