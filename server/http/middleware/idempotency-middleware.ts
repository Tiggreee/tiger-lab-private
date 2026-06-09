import { HttpError } from '../errors';
import { Middleware } from '../types';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { readStore, writeStore } from './durable-store';

interface IdempotencyRecord {
  readonly fingerprint: string;
  readonly statusCode: number;
  readonly payload: string;
  readonly createdAt: number;
}

type IdempotencyStore = Record<string, IdempotencyRecord>;

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const IDEMPOTENCY_STORE_FILE = path.resolve(
  process.env.IDEMPOTENCY_STORE_FILE || 'ops/runtime/idempotency-store.json'
);

function computeFingerprint(routeKey: string, body: unknown): string {
  const hash = createHash('sha256');
  hash.update(routeKey);
  hash.update(':');
  hash.update(JSON.stringify(body ?? {}));
  return hash.digest('hex');
}

async function readActiveStore(): Promise<IdempotencyStore> {
  const store = await readStore<IdempotencyStore>(IDEMPOTENCY_STORE_FILE);
  const now = Date.now();
  const activeEntries = Object.entries(store).filter(([, value]) => {
    return typeof value?.createdAt === 'number' && now - value.createdAt <= IDEMPOTENCY_TTL_MS;
  });
  return Object.fromEntries(activeEntries);
}

function sendCachedResponse(res: NodeJS.WritableStream & { writeHead: (statusCode: number, headers?: Record<string, string>) => void; end: (chunk?: string) => void }, statusCode: number, payload: string): void {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload).toString()
  });
  res.end(payload);
}

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

    const cacheKey = `${ctx.routeKey}:${key}`;
    const fingerprint = computeFingerprint(ctx.routeKey, ctx.body);
    const store = await readActiveStore();
    const existing = store[cacheKey];

    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new HttpError(409, 'Idempotency key already used with a different payload.');
      }

      sendCachedResponse(
        ctx.res as NodeJS.WritableStream & { writeHead: (statusCode: number, headers?: Record<string, string>) => void; end: (chunk?: string) => void },
        existing.statusCode,
        existing.payload
      );
      return;
    }

    let responsePayload = '';
    const originalEnd = ctx.res.end.bind(ctx.res);
    const originalWrite = ctx.res.write.bind(ctx.res);

    (ctx.res as any).write = (chunk: any, ...args: any[]) => {
      if (chunk) {
        responsePayload += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
      }
      return originalWrite(chunk, ...args);
    };

    (ctx.res as any).end = (chunk?: any, ...args: any[]) => {
      if (chunk) {
        responsePayload += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
      }
      return originalEnd(chunk, ...args);
    };

    await next();

    (ctx.res as any).write = originalWrite;
    (ctx.res as any).end = originalEnd;

    const statusCode = ctx.res.statusCode || 200;
    if (statusCode >= 200 && statusCode < 300 && responsePayload.length > 0) {
      const nextStore: IdempotencyStore = {
        ...store,
        [cacheKey]: {
          fingerprint,
          statusCode,
          payload: responsePayload,
          createdAt: Date.now()
        }
      };
      await writeStore(IDEMPOTENCY_STORE_FILE, nextStore);
    }
    return;
  }

  await next();
};
