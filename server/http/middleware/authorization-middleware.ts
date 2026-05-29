import { HttpError } from '../errors';
import { Middleware } from '../types';

export function createAuthorizationMiddleware(requiredScopes: readonly string[]): Middleware {
  return async (ctx, next) => {
    if (!ctx.auth) {
      throw new HttpError(401, 'Authentication is required.');
    }

    const missingScope = requiredScopes.find((scope) => !ctx.auth?.scopes.includes(scope));
    if (missingScope) {
      throw new HttpError(403, `Missing required scope: ${missingScope}`);
    }

    await next();
  };
}
