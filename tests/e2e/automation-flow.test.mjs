import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const scripts = [
  ['scripts/scan-repos.mjs'],
  ['scripts/generate-product.mjs', 'FacturAutentico', 'saas'],
  ['scripts/generate-content.mjs', 'facturautentico-cloud', 'post', 'web'],
  ['scripts/publish-content.mjs', 'ops/content/facturautentico-cloud-post-web.md', 'web'],
  ['scripts/capture-leads.mjs'],
  ['scripts/provision-product.mjs']
];

function runNodeScript(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

test('automation script flow runs in dry template mode', async () => {
  for (const scriptArgs of scripts) {
    const result = await runNodeScript(scriptArgs);
    assert.equal(
      result.code,
      0,
      `Script failed: ${scriptArgs.join(' ')}\nSTDOUT: ${result.stdout}\nSTDERR: ${result.stderr}`
    );
  }
});
