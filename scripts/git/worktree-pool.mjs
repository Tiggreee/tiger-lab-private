#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';

const POOL_DIR = resolve('.worktrees');
const STATE_PATH = resolve('ops/runtime/worktree-pool-state.json');

const GUARDRAILS = {
  MAX_WORKTREES: 10,
  MAX_AGE_HOURS: 24,
  CLEANUP_THRESHOLD: 0.8
};

function loadState() {
  try { return JSON.parse(readFileSync(STATE_PATH, 'utf8')); } catch { return { worktrees: [], nextId: 1 }; }
}

function saveState(state) {
  mkdirSync(resolve('ops/runtime'), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function git(args) {
  try {
    return execSync(`git ${args}`, { encoding: 'utf8', timeout: 30000 }).trim();
  } catch (e) {
    return { error: e.stderr || e.message };
  }
}

export function create(agentName, baseBranch = 'main') {
  const state = loadState();
  const activeCount = state.worktrees.filter(w => w.status === 'active').length;

  if (activeCount >= GUARDRAILS.MAX_WORKTREES) {
    cleanup();
    const newActiveCount = state.worktrees.filter(w => w.status === 'active').length;
    if (newActiveCount >= GUARDRAILS.MAX_WORKTREES) {
      return { error: 'Worktree limit reached', limit: GUARDRAILS.MAX_WORKTREES, active: newActiveCount };
    }
  }

  const id = `wt-${agentName}-${state.nextId}`;
  const branch = `agent/${agentName}/${id}`;
  const worktreePath = join(POOL_DIR, id);

  mkdirSync(POOL_DIR, { recursive: true });

  const branchResult = git(`checkout -b ${branch} ${baseBranch} 2>&1`);
  if (branchResult.error) return { error: `Branch creation failed: ${branchResult.error}` };

  const wtResult = git(`worktree add ${worktreePath} ${branch} 2>&1`);
  if (wtResult.error) {
    git(`branch -D ${branch} 2>&1`);
    return { error: `Worktree creation failed: ${wtResult.error}` };
  }

  git(`checkout ${baseBranch} 2>&1`);

  const entry = {
    id,
    agentName,
    branch,
    path: worktreePath,
    baseBranch,
    status: 'active',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + GUARDRAILS.MAX_AGE_HOURS * 60 * 60 * 1000).toISOString()
  };

  state.worktrees.push(entry);
  state.nextId++;
  saveState(state);

  return entry;
}

export function list() {
  const state = loadState();
  const gitWorktrees = git('worktree list');
  return {
    pool: state.worktrees,
    gitWorktrees: typeof gitWorktrees === 'string' ? gitWorktrees.split('\n') : [],
    activeCount: state.worktrees.filter(w => w.status === 'active').length
  };
}

export function release(id) {
  const state = loadState();
  const wt = state.worktrees.find(w => w.id === id);
  if (!wt) return { error: `Worktree not found: ${id}` };

  git(`worktree remove ${wt.path} --force 2>&1`);
  git(`branch -D ${wt.branch} 2>&1`);

  wt.status = 'released';
  wt.releasedAt = new Date().toISOString();
  saveState(state);

  return { released: true, id, branch: wt.branch };
}

export function cleanup() {
  const state = loadState();
  let cleaned = 0;

  for (const wt of state.worktrees) {
    if (wt.status === 'active') {
      const age = Date.now() - new Date(wt.createdAt).getTime();
      const maxAge = GUARDRAILS.MAX_AGE_HOURS * 60 * 60 * 1000;
      if (age > maxAge) {
        git(`worktree remove ${wt.path} --force 2>&1`);
        git(`branch -D ${wt.branch} 2>&1`);
        wt.status = 'expired';
        wt.expiredAt = new Date().toISOString();
        cleaned++;
      }
    }
  }

  saveState(state);
  return { cleaned, remaining: state.worktrees.filter(w => w.status === 'active').length, maxAge: GUARDRAILS.MAX_AGE_HOURS };
}

export function getWorktree(id) {
  const state = loadState();
  return state.worktrees.find(w => w.id === id) || null;
}

const args = process.argv.slice(2);

if (args.includes('--create')) {
  const idx = args.indexOf('--create');
  const agentName = args[idx + 1];
  const baseBranch = args[idx + 2] || 'main';
  console.log(JSON.stringify(create(agentName, baseBranch), null, 2));
} else if (args.includes('--list')) {
  console.log(JSON.stringify(list(), null, 2));
} else if (args.includes('--release')) {
  const id = args[args.indexOf('--release') + 1];
  console.log(JSON.stringify(release(id), null, 2));
} else if (args.includes('--cleanup')) {
  console.log(JSON.stringify(cleanup(), null, 2));
} else if (args.includes('--get')) {
  const id = args[args.indexOf('--get') + 1];
  console.log(JSON.stringify(getWorktree(id), null, 2));
} else {
  console.log('Git Worktree Pool Manager — isolated environments for parallel agents');
  console.log('  --create <agent> [base]   Create worktree for agent');
  console.log('  --list                    List all worktrees');
  console.log('  --release <id>            Release and cleanup worktree');
  console.log('  --cleanup                 Remove expired worktrees (>24h)');
  console.log('  --get <id>                Get worktree details');
}
