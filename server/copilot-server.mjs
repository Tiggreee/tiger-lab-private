#!/usr/bin/env node
/**
 * Minimal Copilot server mode template for automation orchestration.
 */
import http from 'node:http';

const DEFAULT_PORT = Number(process.env.PORT || 8787);

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function respondJson(res, statusCode, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

function makeActionId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function handleRoute(pathname, payload) {
  if (pathname === '/health') {
    return {
      statusCode: 200,
      body: {
        status: 'ok',
        service: 'copilot-server-mode',
        time: new Date().toISOString()
      }
    };
  }

  if (pathname === '/generate-product') {
    const repo = payload.repo || 'unknown-repo';
    const type = payload.type || 'saas';
    return {
      statusCode: 200,
      body: {
        status: 'ok',
        action: 'generate-product',
        result: {
          productId: `${repo}-${type}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          version: '0.1.0',
          artifactPath: `ops/releases/${repo}-${type}.zip`,
          dryRun: payload.dryRun !== false
        }
      }
    };
  }

  if (pathname === '/generate-content') {
    const product = payload.product || 'unknown-product';
    const contentType = payload.type || 'post';
    const channel = payload.channel || 'web';
    return {
      statusCode: 200,
      body: {
        status: 'ok',
        action: 'generate-content',
        result: {
          contentId: makeActionId('content'),
          file: `ops/content/${product}-${contentType}-${channel}.md`,
          channel,
          dryRun: payload.dryRun !== false
        }
      }
    };
  }

  if (pathname === '/provision-product') {
    const userId = payload.userId || 'anonymous';
    const product = payload.product || 'unknown-product';
    return {
      statusCode: 200,
      body: {
        status: 'ok',
        action: 'provision-product',
        result: {
          accountId: makeActionId('acct'),
          userId,
          product,
          apiKeyHint: `${product.slice(0, 4)}_***`,
          dryRun: payload.dryRun !== false
        }
      }
    };
  }

  if (pathname === '/register-payment') {
    const paymentId = payload.paymentId || makeActionId('pay');
    const customerId = payload.customerId || 'customer-demo';
    const productId = payload.productId || 'facturautentico-cloud';
    const planId = payload.planId || 'starter';
    const amount = Number.isFinite(payload.amount) ? payload.amount : 39;
    const currency = payload.currency || 'USD';

    return {
      statusCode: 200,
      body: {
        status: 'ok',
        action: 'register-payment',
        result: {
          paymentId,
          customerId,
          productId,
          planId,
          amount,
          currency,
          dryRun: payload.dryRun !== false
        }
      }
    };
  }

  if (pathname === '/publish-content') {
    const publicationId = payload.publicationId || makeActionId('pub');
    const assetId = payload.assetId || makeActionId('content');
    const channel = payload.channel || 'web';

    return {
      statusCode: 200,
      body: {
        status: 'ok',
        action: 'publish-content',
        result: {
          publicationId,
          assetId,
          channel,
          dryRun: payload.dryRun !== false
        }
      }
    };
  }

  if (pathname === '/bot-query') {
    const message = payload.message || '';
    const responseText = message
      ? `Auto-response generated for: ${message.slice(0, 120)}`
      : 'Auto-response generated.';

    return {
      statusCode: 200,
      body: {
        status: 'ok',
        action: 'bot-query',
        result: {
          reply: responseText,
          recommendation: 'start_trial',
          dryRun: payload.dryRun !== false
        }
      }
    };
  }

  if (pathname === '/conversation-entry') {
    const leadId = payload.leadId || makeActionId('lead');
    const channel = payload.channel || 'whatsapp';
    const destination = String(payload.destination || process.env.SOCIAL_CLOSE_DESTINATION || '').trim();
    const message =
      payload.message ||
      'Hola, vengo de la campana y quiero activar el diagnostico express de 15 min.';

    if ((channel === 'whatsapp' || channel === 'calendar' || channel === 'landing') && !destination) {
      return {
        statusCode: 400,
        body: {
          status: 'error',
          error: `destination is required when channel is ${channel}`
        }
      };
    }

    let entryLink = '';
    if (channel === 'whatsapp') {
      const phone = destination.replace(/[^\d]/g, '');
      if (!/^\d{10,15}$/.test(phone)) {
        return {
          statusCode: 400,
          body: {
            status: 'error',
            error: 'destination must be a valid whatsapp number (10-15 digits)'
          }
        };
      }
      entryLink = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : '';
    } else {
      entryLink = destination;
    }

    return {
      statusCode: 200,
      body: {
        status: 'ok',
        action: 'conversation-entry',
        result: {
          leadId,
          channel,
          destination,
          message,
          entryLink
        }
      }
    };
  }

  return {
    statusCode: 404,
    body: {
      status: 'error',
      error: `Route not found: ${pathname}`
    }
  };
}

export function createCopilotServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const pathname = url.pathname;

      if (req.method === 'GET' && pathname === '/health') {
        const output = handleRoute(pathname, {});
        respondJson(res, output.statusCode, output.body);
        return;
      }

      if (req.method !== 'POST') {
        respondJson(res, 405, {
          status: 'error',
          error: 'Method not allowed. Use POST except for /health'
        });
        return;
      }

      const payload = await readJson(req);
      const output = handleRoute(pathname, payload);
      respondJson(res, output.statusCode, output.body);
    } catch (error) {
      respondJson(res, 400, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

const isDirectExecution =
  typeof process.argv[1] === 'string' &&
  (process.argv[1].endsWith('copilot-server.mjs') || process.argv[1].endsWith('copilot-server.mjs\r'));

if (isDirectExecution) {
  const server = createCopilotServer();
  server.listen(DEFAULT_PORT, () => {
    console.log(`Copilot server mode listening on port ${DEFAULT_PORT}`);
  });
}
