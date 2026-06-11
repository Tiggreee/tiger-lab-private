import { IncomingMessage, ServerResponse } from 'node:http';

export interface AuthContext {
  readonly apiKey: string;
  readonly channel: string;
  readonly scopes: readonly string[];
}

export interface HttpRequestContext {
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
  readonly method: string;
  readonly pathname: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly routeKey: string;
  readonly body: unknown;
  readonly rawBody?: string;
  auth?: AuthContext;
  idempotencyKey?: string;
  traceId?: string;
}

export type NextMiddleware = () => Promise<void>;

export type Middleware = (ctx: HttpRequestContext, next: NextMiddleware) => Promise<void>;

export type HttpHandler = (ctx: HttpRequestContext) => Promise<void>;

export interface HttpRoute {
  readonly method: 'GET' | 'POST';
  readonly path: string;
  readonly requiredScopes?: readonly string[];
  readonly enableIdempotency?: boolean;
  readonly handler: HttpHandler;
}

export interface JsonResponseBody {
  readonly status: 'ok' | 'error';
  readonly action?: string;
  readonly result?: Record<string, unknown>;
  readonly error?: string;
}
