import test from 'node:test';
import assert from 'node:assert/strict';

import { createCopilotServer } from '../../server/copilot-server.mjs';

async function postJson(baseUrl, path, payload) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  return { response, data };
}

test('server mode endpoints respond with expected contract', async () => {
  const server = createCopilotServer();

  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;
  assert.ok(port, 'Expected dynamic port from test server');

  const baseUrl = `http://127.0.0.1:${port}`;

  const healthResponse = await fetch(`${baseUrl}/health`);
  assert.equal(healthResponse.status, 200);
  const healthBody = await healthResponse.json();
  assert.equal(healthBody.status, 'ok');

  const product = await postJson(baseUrl, '/generate-product', {
    repo: 'FacturAutentico',
    type: 'saas',
    dryRun: true
  });
  assert.equal(product.response.status, 200);
  assert.equal(product.data.status, 'ok');
  assert.equal(product.data.action, 'generate-product');
  assert.equal(product.data.result.dryRun, true);

  const content = await postJson(baseUrl, '/generate-content', {
    product: 'facturautentico-cloud',
    type: 'post',
    channel: 'linkedin',
    dryRun: true
  });
  assert.equal(content.response.status, 200);
  assert.equal(content.data.action, 'generate-content');

  const provisioning = await postJson(baseUrl, '/provision-product', {
    userId: 'user_001',
    product: 'facturautentico-cloud',
    dryRun: true
  });
  assert.equal(provisioning.response.status, 200);
  assert.equal(provisioning.data.action, 'provision-product');

  const botQuery = await postJson(baseUrl, '/bot-query', {
    message: 'Necesito facturación automática para mi empresa',
    dryRun: true
  });
  assert.equal(botQuery.response.status, 200);
  assert.equal(botQuery.data.action, 'bot-query');

  const notFound = await postJson(baseUrl, '/unknown-route', { dryRun: true });
  assert.equal(notFound.response.status, 404);
  assert.equal(notFound.data.status, 'error');

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
});
