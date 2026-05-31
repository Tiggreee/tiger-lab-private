#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [, , source = 'unknown'] = process.argv;

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

const leadId = `lead-${Date.now().toString(36)}`;
const createdAt = new Date().toISOString();

const runtimePath = path.resolve('ops/runtime/runtime-state.json');
ensureDirectory(path.dirname(runtimePath));

const runtimeState = readRuntimeState(runtimePath);
runtimeState.leads = runtimeState.leads || {};
runtimeState.leads[leadId] = {
  leadId,
  source,
  createdAt
};

fs.writeFileSync(runtimePath, `${JSON.stringify(runtimeState, null, 2)}\n`, 'utf8');

const eventsPath = path.resolve('ops/runtime/funnel-events.jsonl');
ensureDirectory(path.dirname(eventsPath));
fs.appendFileSync(
  eventsPath,
  `${JSON.stringify({
    type: 'lead_captured',
    occurredAt: createdAt,
    payload: {
      leadId,
      source
    }
  })}\n`,
  'utf8'
);

process.stdout.write(
  `${JSON.stringify({
    ok: true,
    command: 'capture-lead',
    data: {
      leadId,
      source,
      createdAt
    }
  })}\n`
);
