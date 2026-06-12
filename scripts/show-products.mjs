#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const catalog = JSON.parse(fs.readFileSync('ops/catalog/products.json', 'utf8'));
const viabilityPath = 'ops/runtime/product-viability-agent-report.json';
const viability = fs.existsSync(viabilityPath) ? JSON.parse(fs.readFileSync(viabilityPath, 'utf8')) : null;

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║           TIGER LAB — INVENTARIO DE PRODUCTOS           ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

const statusIcon = { active: '✅', paused: '⏸️ ', planned: '📋' };

catalog.products.forEach(p => {
  const icon = statusIcon[p.status] || '❓';
  console.log(`  ${icon} ${p.name}`);
  console.log(`     ID: ${p.id}`);
  console.log(`     Status: ${p.status}`);
  if (p.statusReason) console.log(`     Razón: ${p.statusReason}`);
  const v = viability?.products?.find(vp => vp.productId === p.id);
  if (v?.viability?.status) {
    console.log(`     Viabilidad: ${v.viability.status}`);
    if (v.viability.blockers?.length) {
      v.viability.blockers.forEach(b => console.log(`     ⛔ Blocked: ${b}`));
    }
    if (v.agentDecision) console.log(`     Decisión del agente: ${v.agentDecision}`);
  }
  console.log(`     Planes: ${p.planIds.join(', ')}`);
  console.log('');
});

if (viability?.summary) {
  console.log('────────────────────────────────────────────────────────');
  console.log(`  Viables ahora: ${viability.summary.viableNow}`);
  console.log(`  Bloqueados:    ${viability.summary.blocked}`);
  console.log(`  Inciertos:     ${viability.summary.uncertain}`);
  console.log('');
  console.log(`  🥇 Orden de salida: ${viability.summary.goToMarketOrder.join(' → ')}`);
  console.log('');
  if (viability.summary.unicoBlockerReal) {
    console.log(`  ⚠️  ÚNICO BLOCKER REAL: ${viability.summary.unicoBlockerReal}`);
  }
}
console.log('');
