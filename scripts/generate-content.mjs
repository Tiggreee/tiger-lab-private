#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [, , product, type = 'post', channel = 'web'] = process.argv;

if (!product) {
  console.error('Uso: generate-content.mjs <product> [type] [channel]');
  process.exit(1);
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readRuntimeState(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      leads: {},
      leadScores: {},
      payments: {},
      accounts: {},
      assets: {},
      publications: {}
    };
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      leads: {},
      leadScores: {},
      payments: {},
      accounts: {},
      assets: {},
      publications: {}
    };
  }
}

const safeProduct = product.trim().toLowerCase();
const safeType = type.trim().toLowerCase();
const safeChannel = channel.trim().toLowerCase();
const contentId = `asset-${crypto.randomUUID().slice(0, 8)}`;
const generatedAt = new Date().toISOString();

const contentDir = path.resolve('ops/content');
ensureDirectory(contentDir);
const filePath = path.join(contentDir, `${safeProduct}-${safeType}-${safeChannel}.md`);

const body = `# ${safeProduct} ${safeType} (${safeChannel})\n\nGenerated at: ${generatedAt}\n\n## Hook\n\nProblema claro del ICP hoy y costo de no actuar.\n\n## Promise\n\nActivacion operativa en 24h con foco en conversion medible.\n\n## CTA\n\nResponder ACTIVAR para recibir plan de implementacion.\n`;

fs.writeFileSync(filePath, body, 'utf8');

const runtimePath = path.resolve('ops/runtime/runtime-state.json');
ensureDirectory(path.dirname(runtimePath));
const runtimeState = readRuntimeState(runtimePath);
runtimeState.assets = runtimeState.assets || {};
runtimeState.assets[contentId] = {
  assetId: contentId,
  productId: safeProduct,
  body,
  generatedAt
};
fs.writeFileSync(runtimePath, `${JSON.stringify(runtimeState, null, 2)}\n`, 'utf8');

process.stdout.write(
  `${JSON.stringify({
    ok: true,
    command: 'generate-content',
    data: {
      contentId,
      product: safeProduct,
      type: safeType,
      channel: safeChannel,
      file: filePath
    }
  })}\n`
);
