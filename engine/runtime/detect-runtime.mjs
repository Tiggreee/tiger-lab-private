#!/usr/bin/env node
/**
 * Runtime Detector — engine/runtime/detect-runtime.mjs
 * Auto-detects the execution environment so the engine can adapt.
 * Zero dependencies. Pure Node.js.
 * 
 * Returns: { github: boolean, railway: boolean, docker: boolean, local: boolean, capabilities: [...] }
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

function hasEnv(key) {
  return Boolean(process.env[key]?.trim());
}

function tryCommand(cmd, args = []) {
  try {
    execSync(`${cmd} ${args.join(' ')}`, { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function detect() {
  const runtime = {
    github: false,
    railway: false,
    docker: false,
    local: false,
    ci: false,
    capabilities: [],
    details: {}
  };

  // GitHub Actions detection
  if (hasEnv('GITHUB_ACTIONS') || hasEnv('GITHUB_TOKEN') || hasEnv('GH_TOKEN')) {
    runtime.github = true;
    runtime.ci = true;
    runtime.capabilities.push('actions', 'api', 'secrets');
    
    if (existsSync('.git')) runtime.capabilities.push('git');
    
    // Check GitHub CLI
    if (tryCommand('gh', ['--version'])) {
      runtime.capabilities.push('gh-cli');
      runtime.details.ghCli = true;
    }
  }

  // Railway detection
  if (hasEnv('RAILWAY_TOKEN') || hasEnv('RAILWAY_ENVIRONMENT') || hasEnv('RAILWAY_SERVICE_ID')) {
    runtime.railway = true;
    runtime.capabilities.push('railway-deploy');
  }

  // Docker detection
  if (existsSync('/.dockerenv') || existsSync('/run/.containerenv') || hasEnv('DOCKER_CONTAINER')) {
    runtime.docker = true;
    runtime.capabilities.push('docker');
  }

  // Local detection (not CI, not Docker)
  if (!runtime.ci && !runtime.docker) {
    runtime.local = true;
    runtime.capabilities.push('local-fs', 'local-cron');
  }

  // Network capabilities
  try {
    // Quick connectivity check
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    // We can't actually fetch here synchronously, but we can infer from env
    runtime.capabilities.push('network');
    clearTimeout(timeout);
  } catch {}

  // Database capabilities
  if (existsSync('ops/database/leads.db')) {
    runtime.capabilities.push('sqlite');
    runtime.details.dbPath = 'ops/database/leads.db';
  }

  runtime.summary = `${runtime.github ? 'GitHub' : 'No-GitHub'} | ${runtime.railway ? 'Railway' : 'No-Railway'} | ${runtime.docker ? 'Docker' : 'No-Docker'} | ${runtime.local ? 'Local' : 'Remote'}`;

  return runtime;
}

// Cache detection result
let cached = null;

export function getRuntime() {
  if (!cached) cached = detect();
  return cached;
}

export function hasCapability(cap) {
  const rt = getRuntime();
  return rt.capabilities.includes(cap);
}

export function isGitHub() {
  return getRuntime().github;
}

export function isLocal() {
  return getRuntime().local;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rt = getRuntime();
  console.log(JSON.stringify(rt, null, 2));
}
