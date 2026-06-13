#!/usr/bin/env node
import { runLeadEngine } from '../engine/leads/lead-engine.mjs';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i].startsWith('--')) {
    const k = process.argv[i].slice(2);
    args[k] = (i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--')) ? process.argv[i + 1] : true;
    if (args[k] !== true) i++;
  }
}

runLeadEngine(args).catch(err => { console.error(`FATAL: ${err.message}`); process.exit(1); });
