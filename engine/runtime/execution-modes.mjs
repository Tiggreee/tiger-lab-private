#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const MODES_PATH = resolve('ops/runtime/execution-modes.json');

const MODES = {
  AUTO: {
    name: 'AUTO',
    description: '100% autonomous execution. No human intervention.',
    color: '#3fb950',
    icon: '🤖',
    requiresApproval: false,
    maxTokensPerTask: 50000,
    maxConsecutiveFailures: 3,
    hardTimeoutMs: 300000,
    checkpointInterval: 3
  },
  PRO: {
    name: 'PRO',
    description: 'User approves critical actions. Pauses for confirmation.',
    color: '#6378b0',
    icon: '👤',
    requiresApproval: true,
    approvalTriggers: ['payment', 'provision', 'campaign:publish', 'lead:outreach'],
    maxTokensPerTask: 75000,
    maxConsecutiveFailures: 5,
    hardTimeoutMs: 600000,
    checkpointInterval: 2
  },
  DEV: {
    name: 'DEV',
    description: 'Developer mode. Dry-run with detailed logs. No real execution.',
    color: '#d29922',
    icon: '🔧',
    requiresApproval: false,
    dryRun: true,
    verboseLogging: true,
    maxTokensPerTask: 100000,
    maxConsecutiveFailures: 10,
    hardTimeoutMs: 900000,
    checkpointInterval: 1
  }
};

function loadModes() {
  try {
    if (existsSync(MODES_PATH)) {
      return JSON.parse(readFileSync(MODES_PATH, 'utf8'));
    }
  } catch {}
  return { current: 'AUTO', history: [], lastChanged: new Date().toISOString() };
}

function saveModes(state) {
  mkdirSync(resolve('ops/runtime'), { recursive: true });
  writeFileSync(MODES_PATH, JSON.stringify(state, null, 2), 'utf8');
}

export function getCurrentMode() {
  const state = loadModes();
  return MODES[state.current] || MODES.AUTO;
}

export function setMode(modeName) {
  const mode = MODES[modeName];
  if (!mode) return { error: `Invalid mode: ${modeName}. Valid: ${Object.keys(MODES).join(', ')}` };
  
  const state = loadModes();
  const previous = state.current;
  state.current = modeName;
  state.lastChanged = new Date().toISOString();
  state.history.push({ from: previous, to: modeName, timestamp: state.lastChanged });
  if (state.history.length > 50) state.history = state.history.slice(-50);
  saveModes(state);
  
  return { changed: true, from: previous, to: modeName, mode };
}

export function listModes() {
  const state = loadModes();
  return {
    current: state.current,
    lastChanged: state.lastChanged,
    modes: Object.entries(MODES).map(([key, mode]) => ({
      key,
      ...mode,
      active: key === state.current
    })),
    history: state.history.slice(-10)
  };
}

export function getGuardrails() {
  const mode = getCurrentMode();
  return {
    mode: mode.name,
    maxTokensPerTask: mode.maxTokensPerTask,
    maxConsecutiveFailures: mode.maxConsecutiveFailures,
    hardTimeoutMs: mode.hardTimeoutMs,
    checkpointInterval: mode.checkpointInterval,
    requiresApproval: mode.requiresApproval,
    dryRun: mode.dryRun || false
  };
}

export function requiresApproval(eventType) {
  const mode = getCurrentMode();
  if (!mode.requiresApproval) return false;
  if (!mode.approvalTriggers) return false;
  return mode.approvalTriggers.some(trigger => eventType.includes(trigger));
}

const args = process.argv.slice(2);

if (args.includes('--current')) {
  console.log(JSON.stringify(getCurrentMode(), null, 2));
} else if (args.includes('--set')) {
  const modeName = args[args.indexOf('--set') + 1];
  console.log(JSON.stringify(setMode(modeName), null, 2));
} else if (args.includes('--list')) {
  console.log(JSON.stringify(listModes(), null, 2));
} else if (args.includes('--guardrails')) {
  console.log(JSON.stringify(getGuardrails(), null, 2));
} else if (args.includes('--check-approval')) {
  const eventType = args[args.indexOf('--check-approval') + 1];
  console.log(JSON.stringify({ eventType, requiresApproval: requiresApproval(eventType) }, null, 2));
} else {
  console.log('Execution Modes — Auto/Pro/Dev toggle system');
  console.log('  --current              Show current mode');
  console.log('  --set <mode>           Set mode (AUTO, PRO, DEV)');
  console.log('  --list                 List all modes');
  console.log('  --guardrails           Show current guardrails');
  console.log('  --check-approval <type> Check if event requires approval');
}
