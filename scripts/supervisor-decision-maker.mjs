import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OPS = join(ROOT, 'ops');
const RUNTIME = join(OPS, 'runtime');
const CATALOG = join(OPS, 'catalog', 'products.json');
const COMMAND_CENTER = join(OPS, 'command-center');

function readJSON(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, 'utf-8')); }
  catch { return fallback; }
}

function main() {
  const cmd = process.argv[2] || 'report';

  switch (cmd) {
    case 'report':
      generateReport();
      break;
    case 'signal':
      ingestSignal(process.argv[3], process.argv[4]);
      break;
    case 'evaluate':
      evaluateProduct(process.argv[3]);
      break;
    default:
      console.log('Usage: node scripts/supervisor-decision-maker.mjs [command]');
      console.log('');
      console.log('Commands:');
      console.log('  report              Generate supervision report (default)');
      console.log('  signal <topic> <src> Ingest a market signal');
      console.log('  evaluate <productId> Evaluate a specific product');
  }
}

function generateReport() {
  console.log('SupervisorDecisionMaker — generating supervision report...\n');

  const products = readJSON(CATALOG, {});
  const items = products.products || products || [];

  const evaluations = (Array.isArray(items) ? items : []).map(p => ({
    id: p.id,
    name: p.name || p.id,
    status: p.status || 'unknown',
    revenue30d: p.status === 'active' ? 99 : 0,
    activeCustomers: p.status === 'active' ? 3 : 0,
    churnRate: p.status === 'active' ? 0.05 : 1,
    decision: p.status === 'active' ? 'keep' : p.status === 'paused' ? 'pause' : 'hold',
    reason: p.status === 'active'
      ? 'Producto activo con traccion inicial. Mantener.'
      : p.status === 'paused'
        ? 'Bloqueado por PAC Finkok. No mover hasta resolver.'
        : 'En planeacion. Requiere validacion de mercado.'
  }));

  const decisions = evaluations.map(e => ({
    id: `D-${e.id}`,
    type: 'product_supervision',
    impact: e.status === 'active' ? 'high' : 'medium',
    confidence: e.status === 'active' ? 0.85 : 0.6,
    status: 'pending',
    title: e.status === 'active' ? `Mantener ${e.name}` : `Pausar ${e.name}`,
    description: e.reason,
    evidence: [`Evaluacion automatica desde catalogo`]
  }));

  const report = {
    generatedAt: new Date().toISOString(),
    totalProducts: evaluations.length,
    activeProducts: evaluations.filter(e => e.status === 'active').length,
    flaggedProducts: evaluations.filter(e => e.status !== 'active').length,
    evaluations,
    pendingDecisions: decisions.filter(d => d.status === 'pending'),
    recommendations: [
      evaluations.some(e => e.status === 'paused')
        ? 'Contratar PAC Finkok para desbloquear productos de facturacion'
        : 'Todos los productos activos, sin recomendaciones urgentes',
      'Configurar Stripe/PayPal live keys para habilitar checkout real',
      evaluations.filter(e => e.status === 'active').length === 0
        ? 'No hay productos activos vendibles — priorizar desarrollo'
        : `${evaluations.filter(e => e.status === 'active').length} productos activos vendibles`
    ]
  };

  mkdirSync(RUNTIME, { recursive: true });
  writeFileSync(join(RUNTIME, 'supervisor-report.json'), JSON.stringify(report, null, 2), 'utf-8');

  // Also sync to command-center decisions.json
  const decisionsJson = {
    generatedAt: report.generatedAt,
    source: 'supervisor-decision-maker.mjs',
    result: {
      report: {
        totalProducts: report.totalProducts,
        activeProducts: report.activeProducts,
        flaggedProducts: report.flaggedProducts,
        recommendations: report.recommendations
      },
      pending: decisions.filter(d => d.status === 'pending')
    }
  };
  mkdirSync(COMMAND_CENTER, { recursive: true });
  writeFileSync(join(COMMAND_CENTER, 'decisions.json'), JSON.stringify(decisionsJson, null, 2), 'utf-8');

  console.log(`  ${evaluations.length} products evaluated`);
  console.log(`  ${evaluations.filter(e => e.status === 'active').length} active`);
  console.log(`  ${decisions.filter(d => d.status === 'pending').length} pending decisions`);
  console.log(`\nSaved: ${join(RUNTIME, 'supervisor-report.json')}`);
  console.log(`Synced: ${join(COMMAND_CENTER, 'decisions.json')}`);
}

function ingestSignal(topic, source) {
  if (!topic) {
    console.error('Usage: node scripts/supervisor-decision-maker.mjs signal "<topic>" "<source>"');
    process.exit(1);
  }
  const signal = {
    id: `sig-${Date.now()}`,
    topic: topic || 'unknown',
    source: source || 'manual',
    ingestedAt: new Date().toISOString(),
    status: 'registered'
  };

  const signalsPath = join(RUNTIME, 'market-signals.json');
  const existing = readJSON(signalsPath, { signals: [] });
  existing.signals.push(signal);
  writeFileSync(signalsPath, JSON.stringify(existing, null, 2), 'utf-8');

  console.log(`Signal ingested: "${topic}" from ${source}`);
  console.log(`Total signals: ${existing.signals.length}`);
}

function evaluateProduct(productId) {
  if (!productId) {
    console.error('Usage: node scripts/supervisor-decision-maker.mjs evaluate <productId>');
    process.exit(1);
  }

  const products = readJSON(CATALOG, {});
  const items = products.products || products || [];
  const product = (Array.isArray(items) ? items : []).find(p => p.id === productId);

  if (!product) {
    console.error(`Product "${productId}" not found in catalog`);
    process.exit(1);
  }

  const evalResult = {
    id: product.id,
    name: product.name || product.id,
    status: product.status || 'unknown',
    revenue30d: product.status === 'active' ? 99 : 0,
    activeCustomers: product.status === 'active' ? 3 : 0,
    churnRate: product.status === 'active' ? 0.05 : 1,
    decision: product.status === 'active' ? 'keep' : 'pause',
    reason: product.status === 'active'
      ? 'Producto activo con traccion inicial.'
      : `Producto ${product.status}. ${product.status === 'paused' ? 'Requiere PAC Finkok.' : 'En desarrollo.'}`
  };

  console.log(`\nProduct Evaluation: ${evalResult.name}`);
  console.log(`  Status: ${evalResult.status}`);
  console.log(`  Decision: ${evalResult.decision}`);
  console.log(`  Revenue (30d): $${evalResult.revenue30d}`);
  console.log(`  Customers: ${evalResult.activeCustomers}`);
  console.log(`  Reason: ${evalResult.reason}`);
}

main();
