import { HttpError } from '../errors';
import { Middleware } from '../types';

export interface ApiKeyProfile {
  readonly channel: string;
  readonly scopes: readonly string[];
}

const apiKeyRegistry: Record<string, ApiKeyProfile> = {
  'dev-public-key': {
    channel: 'web',
    scopes: ['health:read', 'product:generate', 'content:generate', 'billing:provision', 'bot:query']
  }
};

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
