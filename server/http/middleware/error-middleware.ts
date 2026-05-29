import { logger } from '../../observability/logger';
import { HttpError } from '../errors';
import { sendJson } from '../response';
import { HttpRequestContext } from '../types';

export function handleHttpError(ctx: HttpRequestContext, error: unknown): void {
  const isHttpError = error instanceof HttpError;
  const statusCode = isHttpError ? error.statusCode : 500;
  const message = error instanceof Error ? error.message : 'Unexpected error';

  logger.log('error', {
    message: 'request.error',
    requestId: ctx.requestId,
    correlationId: ctx.correlationId,
    endpoint: ctx.routeKey,
    statusCode,
    error: message
  });

  sendJson(ctx.res, statusCode, {
    status: 'error',
    error: message
  });
}
