import { HttpError } from '../errors';
import { Middleware } from '../types';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;

type Counter = { count: number; windowStart: number };

const counters = new Map<string, Counter>();

export const rateLimitMiddleware: Middleware = async (ctx, next) => {
  const apiKey = ctx.auth?.apiKey || 'anonymous';
  const counterKey = `${apiKey}:${ctx.routeKey}`;
  const now = Date.now();

  const current = counters.get(counterKey);
  if (!current || now - current.windowStart >= WINDOW_MS) {
    counters.set(counterKey, { count: 1, windowStart: now });
  } else {
    current.count += 1;
    counters.set(counterKey, current);
    if (current.count > MAX_REQUESTS_PER_WINDOW) {
      throw new HttpError(429, 'Rate limit exceeded for current key and endpoint.');
    }
  }

  await next();
};
