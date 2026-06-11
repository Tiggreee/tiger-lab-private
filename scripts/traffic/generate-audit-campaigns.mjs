#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const generator = path.resolve(currentDir, 'generate-social-pack.mjs');

function runPack(args) {
  const result = spawnSync(process.execPath, [generator, ...args], {
    stdio: 'inherit',
    env: process.env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  const baseLink = process.env.SOCIAL_DEFAULT_LINK || process.env.CAMPAIGN_BASE_LINK || '';
  if (!baseLink || baseLink.includes('example.com') || baseLink.includes('tu-landing-real.com')) {
    throw new Error('Set SOCIAL_DEFAULT_LINK or CAMPAIGN_BASE_LINK to a real landing URL before generating audit campaigns.');
  }

  const closeChannel = process.env.SOCIAL_CLOSE_CHANNEL || 'calendar';
  const closeDestination = process.env.SOCIAL_CLOSE_DESTINATION || '';

  runPack([
    '--topic',
    'Cumplimiento CFDI sin caos operativo',
    '--audience',
    'equipos financieros y founders con volumen de facturacion en Mexico',
    '--offer',
    'diagnostico de riesgo fiscal y flujo de timbrado en 15 min',
    '--campaign',
    `mcp-cfdi-${new Date().toISOString().slice(0, 10)}`,
    '--baseLink',
    baseLink,
    '--closeChannel',
    closeChannel,
    '--closeDestination',
    closeDestination,
    '--productName',
    'FacturaAutentica',
    '--problemDetail',
    'errores de timbrado, rechazos PAC y seguimiento manual sin trazabilidad',
    '--primaryOutcome',
    'emitir CFDI con control de evidencia y menor tasa de rechazo',
    '--proofPoint',
    'flujo con evidencia por pago, UUID y estado de envio en runtime',
    '--domainTerms',
    'cfdi,timbrado,pac,sat,uuid,xml,reconciliacion'
  ]);

  runPack([
    '--topic',
    'Campanas con leads calificables en menos de 24h',
    '--audience',
    'equipos de growth y ventas B2B que dependen de outreach y contenido',
    '--offer',
    'playbook de campana + scoring operativo para activar pipeline hoy',
    '--campaign',
    `mcp-leads-${new Date().toISOString().slice(0, 10)}`,
    '--baseLink',
    baseLink,
    '--closeChannel',
    closeChannel,
    '--closeDestination',
    closeDestination,
    '--productName',
    'FacturaAutentica Growth Engine',
    '--problemDetail',
    'campanas sin criterio de calidad, sin follow-up y sin senal para cierre',
    '--primaryOutcome',
    'subir respuesta util y convertir interes en reuniones con contexto real',
    '--proofPoint',
    'pack con scoring por canal, lift proyectado y decision MCP apply/manual-review/block',
    '--domainTerms',
    'lead scoring,campana,cta,pipeline,conversion,follow-up,benchmark'
  ]);

  process.stdout.write('Audit campaigns generated successfully.\n');
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
