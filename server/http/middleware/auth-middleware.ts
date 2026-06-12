import { HttpError } from '../errors';
import { Middleware } from '../types';

export interface ApiKeyProfile {
  readonly channel: string;
  readonly scopes: readonly string[];
}

const DEV_FALLBACK_KEY = 'dev-public-key';
const DEV_FALLBACK_PROFILE: ApiKeyProfile = {
  channel: 'web',
  scopes: [
    'health:read',
    'product:generate',
    'content:generate',
    'billing:provision',
    'billing:register',
    'billing:checkout',
    'bot:query',
    'linkedin:analytics:read'
  ]
};

function parseApiKeyRegistry(): Record<string, ApiKeyProfile> {
  const raw = process.env.API_KEY_REGISTRY;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, ApiKeyProfile>;
      const entries = Object.entries(parsed || {}).filter(([key, value]) => {
        return (
          typeof key === 'string' &&
          key.length > 0 &&
          !!value &&
          typeof value.channel === 'string' &&
          Array.isArray(value.scopes)
        );
      });

      if (entries.length > 0) {
        return Object.fromEntries(entries);
      }
    } catch {
      throw new HttpError(500, 'Invalid API_KEY_REGISTRY format. Must be valid JSON.');
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new HttpError(500, 'API_KEY_REGISTRY is required in production.');
  }

  return {
    [DEV_FALLBACK_KEY]: DEV_FALLBACK_PROFILE
  };
}

const apiKeyRegistry: Record<string, ApiKeyProfile> = parseApiKeyRegistry();

export const authMiddleware: Middleware = async (ctx, next) => {
  const key = ctx.req.headers['x-api-key'];
  const apiKey = typeof key === 'string' ? key : undefined;

  if (!apiKey) {
    throw new HttpError(401, 'Missing x-api-key header.');
  }

  const profile = apiKeyRegistry[apiKey];
  if (!profile) {
    throw new HttpError(401, 'Invalid API key.');
  }

  ctx.auth = {
    apiKey,
    channel: profile.channel,
    scopes: profile.scopes
  };

  await next();
};
