#!/usr/bin/env node
/**
 * GitHub Engine Bridge — integrations/github/engine-bridge.mjs
 * Thin wrapper that calls engine modules from GitHub Actions.
 * All business logic stays in /engine/. This just provides GitHub context.
 */

import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ENGINE_ROOT = resolve('engine');

function runEngine(script, args = []) {
  const scriptPath = resolve(ENGINE_ROOT, script);
  return spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit',
    env: process.env
  });
}

function main() {
  const module = process.argv[2];
  const args = process.argv.slice(3);
  
  const map = {
    'prospect-selector': 'email/prospect-selector.mjs',
    'email-campaign': 'email/email-campaign.mjs',
    'campaign-designer': 'campaigns/campaign-designer.mjs',
    'campaign-router': 'campaigns/campaign-router.mjs'
  };
  
  const script = map[module];
  if (!script) {
    console.error(`Unknown engine module: ${module}`);
    console.error(`Available: ${Object.keys(map).join(', ')}`);
    process.exit(1);
  }
  
  const result = runEngine(script, args);
  process.exit(result.status);
}

main();
