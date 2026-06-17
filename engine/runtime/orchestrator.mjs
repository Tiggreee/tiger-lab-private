#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ORCHESTRATOR_STATE = resolve('ops/runtime/orchestrator-state.json');
const EVENT_BUS = resolve('engine/runtime/event-bus.mjs');
const SKILLS_LOADER = resolve('engine/runtime/skills-loader.mjs');
const MCP_CONNECTOR = resolve('engine/runtime/mcp-connector.mjs');
const WORKTREE_POOL = resolve('scripts/git/worktree-pool.mjs');

const GUARDRAILS = {
  MAX_TOKENS_PER_TASK: 50000,
  MAX_CONSECUTIVE_FAILURES: 3,
  HARD_TIMEOUT_MS: 5 * 60 * 1000,
  CHECKPOINT_INTERVAL: 3
};

function loadState() {
  try { return JSON.parse(readFileSync(ORCHESTRATOR_STATE, 'utf8')); } catch { return { tasks: [], nextId: 1, failures: {} }; }
}

function saveState(state) {
  mkdirSync(resolve('ops/runtime'), { recursive: true });
  writeFileSync(ORCHESTRATOR_STATE, JSON.stringify(state, null, 2), 'utf8');
}

async function emitEvent(type, payload) {
  try {
    const bus = await import(EVENT_BUS);
    return bus.emit(type, payload);
  } catch { return null; }
}

async function loadSkillsFor(agentName) {
  try {
    const loader = await import(SKILLS_LOADER);
    return loader.loadSkills(agentName);
  } catch { return []; }
}

async function callMCP(serverId, toolName, args) {
  try {
    const connector = await import(MCP_CONNECTOR);
    return connector.callTool(serverId, toolName, args);
  } catch { return { error: 'MCP connector unavailable' }; }
}

export async function submitTask(description, context = {}) {
  const state = loadState();
  const task = {
    id: state.nextId,
    description,
    context,
    status: 'pending',
    makerResult: null,
    checkerResult: null,
    finalVerdict: null,
    tokensUsed: 0,
    failures: 0,
    checkpoints: [],
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null
  };
  state.tasks.push(task);
  state.nextId++;
  saveState(state);

  await emitEvent('task:submitted', { taskId: task.id, description });
  return task;
}

function checkGuardrails(task, state) {
  if (task.tokensUsed > GUARDRAILS.MAX_TOKENS_PER_TASK) {
    return { blocked: true, reason: 'Token budget exceeded', limit: GUARDRAILS.MAX_TOKENS_PER_TASK };
  }
  if (task.failures >= GUARDRAILS.MAX_CONSECUTIVE_FAILURES) {
    return { blocked: true, reason: 'Consecutive failure limit reached', limit: GUARDRAILS.MAX_CONSECUTIVE_FAILURES };
  }
  if (task.startedAt && (Date.now() - new Date(task.startedAt).getTime()) > GUARDRAILS.HARD_TIMEOUT_MS) {
    return { blocked: true, reason: 'Hard timeout exceeded', limit: GUARDRAILS.HARD_TIMEOUT_MS };
  }
  return { blocked: false };
}

function saveCheckpoint(task, stage) {
  task.checkpoints.push({ stage, timestamp: new Date().toISOString(), tokensUsed: task.tokensUsed });
}

export async function runMaker(taskId) {
  const state = loadState();
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return { error: `Task not found: ${taskId}` };

  const guardrail = checkGuardrails(task, state);
  if (guardrail.blocked) {
    task.status = 'blocked';
    task.blockedReason = guardrail.reason;
    saveState(state);
    await emitEvent('task:blocked', { taskId, reason: guardrail.reason });
    return { error: guardrail.reason, limit: guardrail.limit };
  }

  task.status = 'maker:running';
  task.startedAt = task.startedAt || new Date().toISOString();
  saveState(state);

  await emitEvent('agent:started', { agent: 'maker', taskId });

  const skills = await loadSkillsFor('maker');
  const prompt = readFileSync(resolve('agents/prompts/maker/v1.md'), 'utf8');

  let injected = prompt;
  try {
    const loader = await import(SKILLS_LOADER);
    injected = loader.injectSkills(prompt, 'maker');
  } catch {}

  const memoryResult = await callMCP('memory', 'save', {
    key: `task-${taskId}-maker-prompt`,
    value: injected.substring(0, 500)
  });

  task.makerResult = {
    promptInjected: true,
    skillsCount: skills.length,
    memorySaved: memoryResult?.saved || false,
    renderedPrompt: injected.substring(0, 200) + '...',
    timestamp: new Date().toISOString()
  };
  task.tokensUsed += injected.length;
  saveCheckpoint(task, 'maker:done');
  task.status = 'maker:done';
  saveState(state);

  await emitEvent('agent:completed', { agent: 'maker', taskId });
  return task.makerResult;
}

export async function runChecker(taskId) {
  const state = loadState();
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return { error: `Task not found: ${taskId}` };
  if (!task.makerResult) return { error: 'Maker must run first' };

  const guardrail = checkGuardrails(task, state);
  if (guardrail.blocked) {
    task.status = 'blocked';
    task.blockedReason = guardrail.reason;
    saveState(state);
    await emitEvent('task:blocked', { taskId, reason: guardrail.reason });
    return { error: guardrail.reason, limit: guardrail.limit };
  }

  task.status = 'checker:running';
  saveState(state);

  await emitEvent('agent:started', { agent: 'checker', taskId });

  const skills = await loadSkillsFor('checker');
  const prompt = readFileSync(resolve('agents/prompts/checker/v1.md'), 'utf8');

  let injected = prompt;
  try {
    const loader = await import(SKILLS_LOADER);
    injected = loader.injectSkills(prompt, 'checker');
  } catch {}

  const checkResult = {
    verdict: 'PASS',
    issues: [],
    skillsApplied: skills.length,
    promptInjected: true,
    timestamp: new Date().toISOString()
  };

  if (task.makerResult.renderedPrompt.includes('secret') || task.makerResult.renderedPrompt.includes('password')) {
    checkResult.verdict = 'FAIL';
    checkResult.issues.push({ severity: 'critical', description: 'Potential secret in maker output' });
    task.failures++;
  }

  task.checkerResult = checkResult;
  task.finalVerdict = checkResult.verdict;
  task.tokensUsed += injected.length;
  saveCheckpoint(task, 'checker:done');
  task.status = 'completed';
  task.completedAt = new Date().toISOString();
  saveState(state);

  await emitEvent('agent:completed', { agent: 'checker', taskId, verdict: checkResult.verdict });
  return checkResult;
}

export async function runPipeline(description, context = {}) {
  const task = await submitTask(description, context);
  await runMaker(task.id);
  const checkResult = await runChecker(task.id);
  return {
    taskId: task.id,
    description,
    verdict: checkResult.verdict,
    issues: checkResult.issues
  };
}

export function getTask(taskId) {
  const state = loadState();
  return state.tasks.find(t => t.id === taskId) || null;
}

export function listTasks(status) {
  const state = loadState();
  if (status) return state.tasks.filter(t => t.status === status);
  return state.tasks;
}

export function stats() {
  const state = loadState();
  const byStatus = {};
  for (const t of state.tasks) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
  }
  return {
    total: state.tasks.length,
    byStatus,
    guardrails: GUARDRAILS,
    totalTokensUsed: state.tasks.reduce((sum, t) => sum + (t.tokensUsed || 0), 0),
    totalFailures: state.tasks.reduce((sum, t) => sum + (t.failures || 0), 0)
  };
}

const args = process.argv.slice(2);

if (args.includes('--run')) {
  const description = args[args.indexOf('--run') + 1] || 'Test task';
  runPipeline(description).then(r => console.log(JSON.stringify(r, null, 2)));
} else if (args.includes('--submit')) {
  const description = args[args.indexOf('--submit') + 1] || 'Test task';
  submitTask(description).then(t => console.log(JSON.stringify(t, null, 2)));
} else if (args.includes('--maker')) {
  const id = parseInt(args[args.indexOf('--maker') + 1]);
  runMaker(id).then(r => console.log(JSON.stringify(r, null, 2)));
} else if (args.includes('--checker')) {
  const id = parseInt(args[args.indexOf('--checker') + 1]);
  runChecker(id).then(r => console.log(JSON.stringify(r, null, 2)));
} else if (args.includes('--get')) {
  const id = parseInt(args[args.indexOf('--get') + 1]);
  console.log(JSON.stringify(getTask(id), null, 2));
} else if (args.includes('--list')) {
  const status = args[args.indexOf('--list') + 1];
  console.log(JSON.stringify(listTasks(status === '--' ? null : status), null, 2));
} else if (args.includes('--stats')) {
  console.log(JSON.stringify(stats(), null, 2));
} else {
  console.log('Orchestrator — Maker/Checker sub-agent pipeline');
  console.log('  --run <description>       Full pipeline: submit → maker → checker');
  console.log('  --submit <description>    Submit task only');
  console.log('  --maker <taskId>          Run maker on task');
  console.log('  --checker <taskId>        Run checker on task');
  console.log('  --get <taskId>            Get task details');
  console.log('  --list [status]           List tasks');
  console.log('  --stats                   Show orchestrator statistics');
}
