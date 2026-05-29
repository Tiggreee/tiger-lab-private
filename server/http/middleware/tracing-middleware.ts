import { tracer } from '../../observability/tracer';
import { Middleware } from '../types';

export const tracingMiddleware: Middleware = async (ctx, next) => {
  const span = tracer.startSpan(ctx.correlationId);
  ctx.traceId = span.traceId;

  await next();

  tracer.endSpan(span);
};
