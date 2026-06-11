import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { bootstrapApplication as bootstrapSharedApplication } from '../../src/shared/infrastructure/bootstrap/app-bootstrap';
import { createServerDependencyContainer } from './dependency-container';
import { HttpError } from '../http/errors';
import { handleHttpError } from '../http/middleware/error-middleware';
import { authMiddleware } from '../http/middleware/auth-middleware';
import { createAuthorizationMiddleware } from '../http/middleware/authorization-middleware';
import { runMiddlewareChain } from '../http/middleware/compose-middleware';
import { idempotencyMiddleware } from '../http/middleware/idempotency-middleware';
import { loggingMiddleware } from '../http/middleware/logging-middleware';
import { rateLimitMiddleware } from '../http/middleware/rate-limit-middleware';
import {
  requestIdMiddleware,
  resolveCorrelationId,
  resolveRequestId
} from '../http/middleware/request-id-middleware';
import { tracingMiddleware } from '../http/middleware/tracing-middleware';
import { readRequestBody } from '../http/request-utils';
import { sendJson } from '../http/response';
import { buildBillingRoutes } from '../http/routes/billing-routes';
import { buildBotRoutes } from '../http/routes/bot-routes';
import { buildContentRoutes } from '../http/routes/content-routes';
import { buildConversationRoutes } from '../http/routes/conversation-routes';
import { buildHealthRoutes } from '../http/routes/health-routes';
import { buildProductRoutes } from '../http/routes/product-routes';
import { Router } from '../http/routes/router';
import { HttpRequestContext, HttpRoute } from '../http/types';

export interface ServerBootstrapResult {
  readonly server: Server;
}

function createRouter(): Router {
  const container = createServerDependencyContainer();
  const router = new Router();

  router.registerMany(buildHealthRoutes(container.healthController));
  router.registerMany(buildProductRoutes(container.productController));
  router.registerMany(buildContentRoutes(container.contentController));
  router.registerMany(buildBillingRoutes(container.billingController));
  router.registerMany(buildBotRoutes(container.botController));
  router.registerMany(buildConversationRoutes(container.botController));

  return router;
}

function shouldBypassAuth(route: HttpRoute): boolean {
  return (
    (route.path === '/health' && route.method === 'GET') ||
    (route.method === 'POST' && route.path.startsWith('/billing/webhooks'))
  );
}

async function handleRequest(req: IncomingMessage, res: ServerResponse, router: Router): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;
  const route = router.resolve(method, pathname);

  if (!route) {
    sendJson(res, 404, {
      status: 'error',
      error: `Route not found: ${pathname}`
    });
    return;
  }

  const requestId = resolveRequestId(typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : undefined);
  const correlationId = resolveCorrelationId(
    typeof req.headers['x-correlation-id'] === 'string' ? req.headers['x-correlation-id'] : undefined,
    requestId
  );

  const requestBody = method === 'POST' ? await readRequestBody(req) : { body: {}, rawBody: '' };

  const ctx: HttpRequestContext = {
    req,
    res,
    method: method as 'GET' | 'POST',
    pathname,
    requestId,
    correlationId,
    routeKey: `${method} ${pathname}`,
    body: requestBody.body,
    rawBody: requestBody.rawBody
  };

  const middleware = [
    requestIdMiddleware,
    tracingMiddleware,
    loggingMiddleware,
    ...(shouldBypassAuth(route) ? [] : [authMiddleware]),
    ...(route.requiredScopes && route.requiredScopes.length > 0
      ? [createAuthorizationMiddleware(route.requiredScopes)]
      : []),
    ...(shouldBypassAuth(route) ? [] : [rateLimitMiddleware]),
    ...(route.enableIdempotency ? [idempotencyMiddleware] : [])
  ];

  await runMiddlewareChain(ctx, middleware, async () => {
    await route.handler(ctx);
  });
}

export function bootstrapServerApplication(): ServerBootstrapResult {
  // Shared bootstrap is invoked to keep alignment with base app lifecycle.
  bootstrapSharedApplication();
  const router = createRouter();

  const server = createServer(async (req, res) => {
    try {
      await handleRequest(req, res, router);
    } catch (error) {
      const fallbackContext: HttpRequestContext = {
        req,
        res,
        method: ((req.method || 'GET').toUpperCase() as 'GET' | 'POST'),
        pathname: new URL(req.url || '/', 'http://localhost').pathname,
        requestId: resolveRequestId(typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : undefined),
        correlationId: resolveCorrelationId(
          typeof req.headers['x-correlation-id'] === 'string' ? req.headers['x-correlation-id'] : undefined,
          undefined
        ),
        routeKey: `${(req.method || 'GET').toUpperCase()} ${new URL(req.url || '/', 'http://localhost').pathname}`,
        body: {}
      };

      if (error instanceof HttpError) {
        handleHttpError(fallbackContext, error);
        return;
      }

      handleHttpError(fallbackContext, new HttpError(500, error instanceof Error ? error.message : 'Unknown error'));
    }
  });

  return {
    server
  };
}
