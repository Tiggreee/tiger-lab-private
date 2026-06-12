import { PaymentGatewayPort } from '../../src/billing/application/ports/out/external';
import { randomUUID } from 'node:crypto';

export interface StripeCheckoutSession {
  readonly sessionId: string;
  readonly url: string;
  readonly amount: number;
  readonly currency: string;
}

export class StripePaymentService implements PaymentGatewayPort {
  private readonly apiBaseUrl = 'https://api.stripe.com/v1';
  private readonly requestTimeoutMs: number;

  constructor(
    private readonly secretKey: string,
    private readonly webhookSecret: string
  ) {
    this.requestTimeoutMs = Number(process.env.STRIPE_HTTP_TIMEOUT_MS || 10_000);
  }

  private async stripeFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      return await fetch(`${this.apiBaseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          ...(init.headers || {})
        },
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Stripe request timeout after ${this.requestTimeoutMs}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  public async createCheckoutSession(
    amount: number,
    currency: string,
    returnUrl: string,
    cancelUrl: string,
    productName = 'Tiger Lab Product'
  ): Promise<StripeCheckoutSession> {
    const body = new URLSearchParams({
      'mode': 'payment',
      'payment_method_types[]': 'card',
      'line_items[0][price_data][currency]': currency.toLowerCase(),
      'line_items[0][price_data][product_data][name]': productName,
      'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)),
      'line_items[0][quantity]': '1',
      'success_url': returnUrl,
      'cancel_url': cancelUrl
    });

    const response = await this.stripeFetch('/checkout/sessions', {
      method: 'POST',
      body: body.toString()
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Stripe checkout session creation failed: ${response.status} ${text}`);
    }

    const session = await response.json();
    return {
      sessionId: session.id,
      url: session.url,
      amount,
      currency
    };
  }

  public async confirmPayment(paymentId: string): Promise<void> {
    const response = await this.stripeFetch(`/checkout/sessions/${encodeURIComponent(paymentId)}`);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Stripe payment confirmation failed: ${response.status} ${text}`);
    }

    const session = await response.json();
    if (session.payment_status !== 'paid') {
      throw new Error(`Stripe payment is not completed yet. Status: ${session.payment_status}`);
    }
  }

  public verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required for Stripe webhook verification.');
    }

    const webhookId = this.extractWebhookId(signature);
    if (!webhookId || !signature) {
      return false;
    }

    const expected = this.computeSignature(rawBody, this.webhookSecret);
    return expected === signature;
  }

  private extractWebhookId(signature: string): string | null {
    const match = signature.match(/t=(\d+)/);
    return match ? match[1] : null;
  }

  private computeSignature(payload: string, secret: string): string {
    const { createHmac } = require('node:crypto');
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  public extractPaymentIntentFromWebhook(event: Record<string, unknown>): string | null {
    const data = event.data as Record<string, unknown> | undefined;
    const object = data?.object as Record<string, unknown> | undefined;
    const paymentIntent = object?.payment_intent as string | undefined;
    return paymentIntent || null;
  }

  public extractAmountFromWebhook(event: Record<string, unknown>): number {
    const data = event.data as Record<string, unknown> | undefined;
    const object = data?.object as Record<string, unknown> | undefined;
    const amount = object?.amount_total as number | undefined;
    return amount ? Math.round(amount) / 100 : 0;
  }

  public extractCurrencyFromWebhook(event: Record<string, unknown>): string | null {
    const data = event.data as Record<string, unknown> | undefined;
    const object = data?.object as Record<string, unknown> | undefined;
    const currency = object?.currency as string | undefined;
    return currency || null;
  }
}
