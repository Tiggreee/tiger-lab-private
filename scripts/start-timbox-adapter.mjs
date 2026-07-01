#!/usr/bin/env node

import { accessSync, constants } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

function existsExecutable(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function resolvePhpBin() {
  const explicit = process.env.PHP_BIN?.trim();
  if (explicit) {
    return explicit;
  }

  const localPhp = resolve('tools/php/php/php.exe');
  if (existsExecutable(localPhp)) {
    return localPhp;
  }

  return 'php';
}

const phpBin = resolvePhpBin();
const args = [
  '-S',
  '127.0.0.1:8788',
  '-t',
  'integrations/timbox/php-adapter/public',
  'integrations/timbox/php-adapter/router.php'
];

const child = spawn(phpBin, args, {
  stdio: 'inherit',
  shell: false
});

child.on('error', (error) => {
  console.error(`Unable to start Timbox adapter with '${phpBin}': ${error.message}`);
  console.error('Install PHP globally or ensure tools/php/php/php.exe exists.');
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Timbox adapter exited due to signal: ${signal}`);
    process.exitCode = 1;
    return;
  }

  process.exitCode = code ?? 0;
});
