import { logger } from '../../observability/logger';
import { Middleware } from '../types';

export const loggingMiddleware: Middleware = async (ctx, next) => {
  const startedAt = Date.now();

  logger.log('info', {
    message: 'request.start',
    requestId: ctx.requestId,
    correlationId: ctx.correlationId,
    endpoint: ctx.routeKey,
    metadata: { method: ctx.method, pathname: ctx.pathname }
  });

  await next();

  logger.log('info', {
    message: 'request.end',
    requestId: ctx.requestId,
    correlationId: ctx.correlationId,
    endpoint: ctx.routeKey,
    statusCode: ctx.res.statusCode,
    metadata: { durationMs: Date.now() - startedAt }
  });
};
