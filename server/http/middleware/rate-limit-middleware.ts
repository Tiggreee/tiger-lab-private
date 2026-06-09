import { HttpError } from '../errors';
import { Middleware } from '../types';
import path from 'node:path';
import { readStore, writeStore } from './durable-store';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;
const RATE_LIMIT_STORE_FILE = path.resolve(
  process.env.RATE_LIMIT_STORE_FILE || 'ops/runtime/rate-limit-store.json'
);

type Counter = { count: number; windowStart: number };
type CounterStore = Record<string, Counter>;

const counters = new Map<string, Counter>();

async function loadDurableCounters(): Promise<CounterStore> {
  const raw = await readStore<CounterStore>(RATE_LIMIT_STORE_FILE);
  const now = Date.now();
  const active = Object.entries(raw).filter(([, value]) => now - value.windowStart < WINDOW_MS);
  return Object.fromEntries(active);
}

function setRateHeaders(ctx: Parameters<Middleware>[0], count: number): void {
  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - count);
  ctx.res.setHeader('x-ratelimit-limit', String(MAX_REQUESTS_PER_WINDOW));
  ctx.res.setHeader('x-ratelimit-remaining', String(remaining));
  ctx.res.setHeader('x-ratelimit-window-ms', String(WINDOW_MS));
}

export const rateLimitMiddleware: Middleware = async (ctx, next) => {
  const apiKey = ctx.auth?.apiKey || 'anonymous';
  const counterKey = `${apiKey}:${ctx.routeKey}`;
  const now = Date.now();

  const durableCounters = await loadDurableCounters();
  const durableCurrent = durableCounters[counterKey];
  if (durableCurrent) {
    counters.set(counterKey, durableCurrent);
  }

  const current = counters.get(counterKey);
  if (!current || now - current.windowStart >= WINDOW_MS) {
    const fresh = { count: 1, windowStart: now };
    counters.set(counterKey, fresh);
    durableCounters[counterKey] = fresh;
    await writeStore(RATE_LIMIT_STORE_FILE, durableCounters);
    setRateHeaders(ctx, fresh.count);
  } else {
    current.count += 1;
    counters.set(counterKey, current);
    durableCounters[counterKey] = current;
    await writeStore(RATE_LIMIT_STORE_FILE, durableCounters);
    setRateHeaders(ctx, current.count);
    if (current.count > MAX_REQUESTS_PER_WINDOW) {
      throw new HttpError(429, 'Rate limit exceeded for current key and endpoint.');
    }
  }

  await next();
};
