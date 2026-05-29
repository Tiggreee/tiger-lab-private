#!/usr/bin/env node
/**
 * server-mode-test-client.mjs
 * Cliente de prueba para validar endpoints del server mode.
 * Uso:
 *   node scripts/server-mode-test-client.mjs
 *   SERVER_MODE_URL=http://127.0.0.1:8787 node scripts/server-mode-test-client.mjs
 */

const baseUrl = process.env.SERVER_MODE_URL || 'http://127.0.0.1:8787';

async function getJson(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  const body = await response.json();
  return { status: response.status, body };
}

async function postJson(pathname, payload) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function run() {
  const checks = [];

  checks.push([
    'health',
    await getJson('/health')
  ]);

  checks.push([
    'generate-product',
    await postJson('/generate-product', {
      repo: 'FacturAutentico',
      type: 'saas',
      dryRun: true
    })
  ]);

  checks.push([
    'generate-content',
    await postJson('/generate-content', {
      product: 'facturautentico-cloud',
      type: 'post',
      channel: 'linkedin',
      dryRun: true
    })
  ]);

  checks.push([
    'provision-product',
    await postJson('/provision-product', {
      userId: 'user_001',
      product: 'facturautentico-cloud',
      dryRun: true
    })
  ]);

  checks.push([
    'bot-query',
    await postJson('/bot-query', {
      message: 'Necesito un plan para facturacion automatica.',
      dryRun: true
    })
  ]);

  const output = {
    baseUrl,
    executedAt: new Date().toISOString(),
    checks: checks.map(([name, result]) => ({
      endpoint: name,
      statusCode: result.status,
      status: result.body?.status || 'unknown',
      action: result.body?.action || null,
      ok: result.status >= 200 && result.status < 300
    }))
  };

  console.log(JSON.stringify(output, null, 2));

  const hasFailure = output.checks.some((item) => !item.ok);
  if (hasFailure) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('[server-mode-test-client] Error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
