#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function existsExecutable(filePath) {
  return existsSync(filePath);
}

function resolvePhpBin(rootDir) {
  const explicit = (process.env.PHP_BIN || '').trim();
  if (explicit) {
    return explicit;
  }

  const bundledPhp = path.join(rootDir, 'tools', 'php', 'php', 'php.exe');
  if (existsExecutable(bundledPhp)) {
    return path.resolve(bundledPhp);
  }

  return 'php';
}

function runStep(label, command, args, env = {}) {
  console.log(label);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      ...env
    }
  });

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    if (result.error.code === 'ENOENT' && command.toLowerCase().includes('php')) {
      console.error(`ERROR: No se encontro PHP ejecutable (${command}).`);
      console.error('Define PHP_BIN o instala PHP en PATH.');
      console.error('Sugerido en este repo: PHP_BIN=tools/php/php/php.exe');
    } else {
      console.error(`ERROR: ${result.error.message}`);
    }
    process.exit(1);
  }
}

function runNpmStep(label, npmArgs, env = {}) {
  const npmExecPath = (process.env.npm_execpath || '').trim();
  if (npmExecPath) {
    runStep(label, process.execPath, [npmExecPath, ...npmArgs], env);
    return;
  }

  // Fallback when npm_execpath is not available.
  const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  runStep(label, npmBin, npmArgs, env);
}

function printHelp() {
  console.log('Usage: node scripts/timbox-run-staging-flow.mjs');
  console.log('Runs: sign dry-run -> cfdi inspect strict -> sign and timbrar.');
  console.log('Environment variables: TIMBOX_ENV, CFDI_XML_PATH, CFDI_SIGNED_XML_PATH, CSD_KEY_PASSWORD, TIMBOX_AUTO_REFRESH_FECHA');
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const phpBin = resolvePhpBin(rootDir);
const cfdiXmlPath = process.env.CFDI_XML_PATH || path.join(rootDir, 'integrations', 'timbox', 'cfdi-test.xml');
const signedXmlPath = process.env.CFDI_SIGNED_XML_PATH || path.join(rootDir, 'integrations', 'timbox', 'cfdi-signed.xml');
const timboxEnv = process.env.TIMBOX_ENV || 'staging';

runStep('[1/3] Firmar CFDI (dry-run, sin timbrar)', phpBin, ['scripts/sign-and-timbrar.php'], {
  TIMBOX_ENV: timboxEnv,
  TIMBOX_DRY_RUN: 'true',
  TIMBOX_AUTO_REFRESH_FECHA: process.env.TIMBOX_AUTO_REFRESH_FECHA || 'true',
  CFDI_XML_PATH: cfdiXmlPath,
  CFDI_SIGNED_XML_PATH: signedXmlPath
});

runNpmStep('[2/3] Validar XML firmado (preflight estricto)', ['run', 'timbox:cfdi:inspect:strict'], {
  TIMBOX_SXML_PATH: signedXmlPath
});

runStep(`[3/3] Timbrar en ${timboxEnv}`, phpBin, ['scripts/sign-and-timbrar.php'], {
  TIMBOX_ENV: timboxEnv,
  TIMBOX_DRY_RUN: 'false',
  TIMBOX_AUTO_REFRESH_FECHA: process.env.TIMBOX_AUTO_REFRESH_FECHA || 'true',
  CFDI_XML_PATH: cfdiXmlPath,
  CFDI_SIGNED_XML_PATH: signedXmlPath
});

console.log('Flow completado.');
