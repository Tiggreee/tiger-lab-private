#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [, , file, channel = 'web'] = process.argv;

if (!file) {
  console.error('Uso: publish-content.mjs <file> [channel]');
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
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

const inputPath = path.resolve(file);
if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

const safeChannel = channel.trim().toLowerCase();
const publicationId = `pub-${crypto.randomUUID().slice(0, 8)}`;
const publishedAt = new Date().toISOString();

const publishedDir = path.resolve('ops/published', safeChannel);
ensureDirectory(publishedDir);

const targetName = `${path.basename(inputPath, path.extname(inputPath))}-${Date.now()}${path.extname(inputPath) || '.md'}`;
const publishedPath = path.join(publishedDir, targetName);

const content = fs.readFileSync(inputPath, 'utf8');
fs.writeFileSync(publishedPath, content, 'utf8');

const runtimePath = path.resolve('ops/runtime/runtime-state.json');
ensureDirectory(path.dirname(runtimePath));
const runtimeState = readRuntimeState(runtimePath);
runtimeState.publications = runtimeState.publications || {};
runtimeState.publications[publicationId] = {
  publicationId,
  assetId: path.basename(inputPath, path.extname(inputPath)),
  channel: safeChannel,
  publishedAt
};
fs.writeFileSync(runtimePath, `${JSON.stringify(runtimeState, null, 2)}\n`, 'utf8');

process.stdout.write(
  `${JSON.stringify({
    ok: true,
    command: 'publish-content',
    data: {
      publicationId,
      channel: safeChannel,
      sourceFile: inputPath,
      publishedFile: publishedPath
    }
  })}\n`
);
