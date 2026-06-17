import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, extname, join } from 'node:path';
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
import { buildCatalogRoutes } from '../http/routes/catalog-routes';
import { buildContentRoutes } from '../http/routes/content-routes';
import { buildConversationRoutes } from '../http/routes/conversation-routes';
import { buildDecisionRoutes } from '../http/routes/decision-routes';
import { buildDevAccessRoutes } from '../http/routes/dev-access-routes';
import { buildHealthRoutes } from '../http/routes/health-routes';
import { buildLinkedInIntegrationRoutes } from '../http/routes/linkedin-integration-routes';
import { buildProductRoutes } from '../http/routes/product-routes';
import { buildExecutionModeRoutes } from '../http/routes/execution-mode-routes';
import { buildModelRoutes } from '../http/routes/model-routes';
import { buildTelemetryRoutes } from '../http/routes/telemetry-routes';
import { Router } from '../http/routes/router';
import { HttpRequestContext, HttpRoute } from '../http/types';

export interface ServerBootstrapResult {
  readonly server: Server;
}

function createRouter(): Router {
  const container = createServerDependencyContainer();
  const router = new Router();

  router.registerMany(buildHealthRoutes(container.healthController));
  router.registerMany(buildLinkedInIntegrationRoutes(container.linkedInIntegrationController));
  router.registerMany(buildProductRoutes(container.productController));
  router.registerMany(buildContentRoutes(container.contentController));
  router.registerMany(buildBillingRoutes(container.billingController));
  router.registerMany(buildBotRoutes(container.botController));
  router.registerMany(buildConversationRoutes(container.botController));
  router.registerMany(buildDevAccessRoutes());
  router.registerMany(buildCatalogRoutes(container.catalogController));
  router.registerMany(buildDecisionRoutes(container.decisionController));
  router.registerMany(buildExecutionModeRoutes(container.executionModeController));
  router.registerMany(buildModelRoutes(container.modelController));
  router.registerMany(buildTelemetryRoutes(container.telemetryController));

  return router;
}

function shouldBypassAuth(route: HttpRoute): boolean {
  return (
    (route.path === '/health' && route.method === 'GET') ||
    route.path.startsWith('/dev-access/') ||
    (route.method === 'GET' && route.path.startsWith('/integrations/linkedin/oauth/')) ||
    (route.method === 'POST' && route.path.startsWith('/billing/webhooks'))
  );
}

// Dashboard static files
const COMMAND_CENTER_ROOT = resolve('ops/command-center');
const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveStaticFile(res: ServerResponse, urlPath: string): boolean {
  // Map dashboard root to index.html
  if (urlPath === '/' || urlPath === '/index.html') {
    urlPath = '/index.html';
  }
  
  const cleanPath = urlPath.startsWith('/command-center/') ? urlPath.replace('/command-center/', '') : null;
  if (!cleanPath && urlPath !== '/index.html' && !urlPath.startsWith('/faces/') && !urlPath.startsWith('/runtime/') && !urlPath.startsWith('/app.js') && !urlPath.startsWith('/campaign-manager.js') && !urlPath.startsWith('/campaign-preview.html') && !urlPath.startsWith('/project-map.html') && !urlPath.startsWith('/project-map-3d.html') && !urlPath.startsWith('/project-map-b.html') && !urlPath.startsWith('/checkout.html') && !urlPath.startsWith('/client-dashboard.html') && !urlPath.startsWith('/botFace') && !urlPath.startsWith('/faces/')) {
    return false;
  }
  
  const filePath = resolve(COMMAND_CENTER_ROOT, cleanPath || urlPath.replace('/', ''));
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return false;
  }
  
  const ext = extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
  
  try {
    const data = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

function handleDashboardRoute(res: ServerResponse, urlPath: string): boolean {
  // Serve runtime data files
  if (urlPath.startsWith('/runtime/')) {
    const dataFile = resolve('ops', urlPath.replace(/^\//, ''));
    if (existsSync(dataFile)) {
      const data = readFileSync(dataFile, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(data);
      return true;
    }
    return false;
  }
  
  return serveStaticFile(res, urlPath);
}

async function handleRequest(req: IncomingMessage, res: ServerResponse, router: Router): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;

  // Dashboard static files — bypass router
  if (method === 'GET' && handleDashboardRoute(res, pathname)) {
    return;
  }
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
