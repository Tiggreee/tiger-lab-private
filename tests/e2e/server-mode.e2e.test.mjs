import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

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
  const previousEnv = {
    PAYMENT_GATEWAY_CONFIRM_URL: process.env.PAYMENT_GATEWAY_CONFIRM_URL,
    ENTITLEMENT_API_URL: process.env.ENTITLEMENT_API_URL,
    CONTENT_PUBLISHER_API_URL: process.env.CONTENT_PUBLISHER_API_URL
  };

  const backendServer = createServer((req, res) => {
    const ok = req.method === 'POST' && ['/payment', '/entitlement', '/content'].includes(req.url || '');
    res.writeHead(ok ? 200 : 404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: ok ? 'ok' : 'not-found' }));
  });

  await new Promise((resolve) => backendServer.listen(0, resolve));
  const backendAddress = backendServer.address();
  const backendPort = typeof backendAddress === 'object' && backendAddress ? backendAddress.port : null;
  assert.ok(backendPort, 'Expected dynamic port from backend mock server');

  process.env.PAYMENT_GATEWAY_CONFIRM_URL = `http://127.0.0.1:${backendPort}/payment`;
  process.env.ENTITLEMENT_API_URL = `http://127.0.0.1:${backendPort}/entitlement`;
  process.env.CONTENT_PUBLISHER_API_URL = `http://127.0.0.1:${backendPort}/content`;

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

  const payment = await postJson(baseUrl, '/register-payment', {
    paymentId: 'pay_001',
    customerId: 'customer_001',
    productId: 'facturautentico-cloud',
    planId: 'starter',
    amount: 39,
    currency: 'USD',
    dryRun: false
  });
  assert.equal(payment.response.status, 200);
  assert.equal(payment.data.action, 'register-payment');

  const provisioning = await postJson(baseUrl, '/provision-product', {
    accountId: 'acct_001',
    paymentId: 'pay_001',
    userId: 'user_001',
    product: 'facturautentico-cloud',
    dryRun: false
  });
  assert.equal(provisioning.response.status, 200);
  assert.equal(provisioning.data.action, 'provision-product');

  const publication = await postJson(baseUrl, '/publish-content', {
    publicationId: 'pub_001',
    assetId: content.data.result.contentId,
    channel: 'linkedin',
    dryRun: false
  });
  assert.equal(publication.response.status, 200);
  assert.equal(publication.data.action, 'publish-content');

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

  await new Promise((resolve, reject) => {
    backendServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  process.env.PAYMENT_GATEWAY_CONFIRM_URL = previousEnv.PAYMENT_GATEWAY_CONFIRM_URL;
  process.env.ENTITLEMENT_API_URL = previousEnv.ENTITLEMENT_API_URL;
  process.env.CONTENT_PUBLISHER_API_URL = previousEnv.CONTENT_PUBLISHER_API_URL;
});
