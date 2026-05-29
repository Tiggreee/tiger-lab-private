import { randomUUID } from 'node:crypto';
import { Middleware } from '../types';

export const requestIdMiddleware: Middleware = async (ctx, next) => {
  ctx.res.setHeader('x-request-id', ctx.requestId);
  ctx.res.setHeader('x-correlation-id', ctx.correlationId);
  await next();
};

export function resolveRequestId(value?: string): string {
  return value?.trim() || randomUUID();
}

export function resolveCorrelationId(value?: string, fallback?: string): string {
  return value?.trim() || fallback || randomUUID();
}
