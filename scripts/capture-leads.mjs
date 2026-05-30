#!/usr/bin/env node
/**
 * capture-leads.mjs
 * Backward-compatible alias for capture-lead command.
 */
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const targetScript = resolve(currentDir, 'capture-lead.mjs');
const args = process.argv.slice(2);

const child = spawn(process.execPath, [targetScript, ...args], { stdio: 'inherit' });

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
