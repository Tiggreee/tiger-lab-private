import { HttpError } from '../errors';
import { Middleware } from '../types';

export const idempotencyMiddleware: Middleware = async (ctx, next) => {
  if (ctx.method !== 'POST') {
    await next();
    return;
  }

  const key = ctx.req.headers['x-idempotency-key'];
  if (key !== undefined && typeof key !== 'string') {
    throw new HttpError(400, 'x-idempotency-key must be a string when provided.');
  }

  if (typeof key === 'string') {
    ctx.idempotencyKey = key;
  }

  await next();
};
