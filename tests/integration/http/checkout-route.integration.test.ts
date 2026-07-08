import { describe, expect, it } from 'vitest';
import { buildBillingRoutes } from '../../../server/http/routes/billing-routes';
import { resolveCheckoutPrice } from '../../../server/http/routes/checkout-support';

interface CapturedResponse {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: string;
  ended: boolean;
}

function createMockContext(url: string): { ctx: never; captured: CapturedResponse } {
  const captured: CapturedResponse = { ended: false };
  const res = {
    writeHead(statusCode: number, headers: Record<string, string>) {
      captured.statusCode = statusCode;
      captured.headers = headers;
      return this;
    },
    end(body?: string) {
      captured.body = body;
      captured.ended = true;
      return this;
    }
  };
  const ctx = { req: { url }, res } as unknown as never;
  return { ctx, captured };
}

function getCheckoutHandler(controller: unknown) {
  const routes = buildBillingRoutes(controller as never);
  const route = routes.find((candidate) => candidate.method === 'GET' && candidate.path === '/checkout');
  if (!route) {
    throw new Error('GET /checkout route not registered');
  }
  return route.handler;
}

describe('GET /checkout public route', () => {
  it('resolves real published prices from pricing.json', () => {
    const price = resolveCheckoutPrice('docflow-api', 'starter');
    expect(price).toBeDefined();
    expect(price?.currency).toBe('USD');
    expect(typeof price?.amount).toBe('number');
    expect(price?.amount).toBeGreaterThan(0);
  });

  it('302-redirects the buyer to the hosted payment page when a session is created', async () => {
    const controller = {
      createCheckoutSession: async () => ({
        status: 'ok',
        action: 'create-checkout-session',
        result: { approvalUrl: 'https://payment.example/session/abc', provider: 'stripe' }
      })
    };

    const handler = getCheckoutHandler(controller);
    const { ctx, captured } = createMockContext('/checkout?product=docflow-api&plan=starter');
    await handler(ctx);

    expect(captured.statusCode).toBe(302);
    expect(captured.headers?.location).toBe('https://payment.example/session/abc');
    expect(captured.ended).toBe(true);
  });

  it('falls back to the alternate provider when the first one is not configured', async () => {
    const attempts: string[] = [];
    const controller = {
      createCheckoutSession: async (request: { provider?: string }) => {
        attempts.push(request.provider ?? 'default');
        if (request.provider === 'stripe') {
          throw new Error('Stripe is not configured in the server.');
        }
        return {
          status: 'ok',
          action: 'create-checkout-session',
          result: { approvalUrl: 'https://paypal.example/approve/xyz', provider: 'paypal' }
        };
      }
    };

    const handler = getCheckoutHandler(controller);
    const { ctx, captured } = createMockContext('/checkout?product=docflow-api');
    await handler(ctx);

    expect(attempts).toEqual(['stripe', 'paypal']);
    expect(captured.statusCode).toBe(302);
    expect(captured.headers?.location).toBe('https://paypal.example/approve/xyz');
  });

  it('renders a safe fallback page (never 404/500) when no provider can create a session', async () => {
    const controller = {
      createCheckoutSession: async () => {
        throw new Error('No payment provider configured.');
      }
    };

    const handler = getCheckoutHandler(controller);
    const { ctx, captured } = createMockContext('/checkout?product=docflow-api');
    await handler(ctx);

    expect(captured.statusCode).toBe(200);
    expect(captured.headers?.['content-type']).toContain('text/html');
    expect(captured.body).toContain('Docflow API');
  });
});
