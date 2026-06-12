import { PaymentGatewayPort } from '../../src/billing/application/ports/out/external';

interface PayPalLink {
  readonly href: string;
  readonly rel: string;
  readonly method: string;
}

interface PayPalOrderResponse {
  readonly id: string;
  readonly status: string;
  readonly links?: ReadonlyArray<PayPalLink>;
  readonly purchase_units?: ReadonlyArray<{
    readonly payments?: {
      readonly captures?: ReadonlyArray<{
        readonly status: string;
      }>;
    };
  }>;
}

export interface PayPalCheckoutSession {
  readonly sessionId: string;
  readonly approvalUrl: string;
  readonly amount: number;
  readonly currency: string;
}

export class PayPalPaymentService implements PaymentGatewayPort {
  private readonly apiBaseUrl: string;
  private readonly requestTimeoutMs: number;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly liveMode = false
  ) {
    this.apiBaseUrl = this.liveMode
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
    this.requestTimeoutMs = Number(process.env.PAYPAL_HTTP_TIMEOUT_MS || 10_000);
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`PayPal request timeout after ${this.requestTimeoutMs}ms.`);
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
    cancelUrl: string
  ): Promise<PayPalCheckoutSession> {
    const accessToken = await this.getAccessToken();
    const response = await this.fetchWithTimeout(`${this.apiBaseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toFixed(2)
            }
          }
        ],
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl
        }
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`PayPal checkout session creation failed: ${response.status} ${body}`);
    }

    const body = (await response.json()) as PayPalOrderResponse;
    const approvalUrl = body.links?.find((link) => link.rel === 'approve')?.href;

    if (!approvalUrl) {
      throw new Error('PayPal approval URL is missing in the checkout session response.');
    }

    return {
      sessionId: body.id,
      approvalUrl,
      amount,
      currency
    };
  }

  public async confirmPayment(paymentId: string): Promise<void> {
    const accessToken = await this.getAccessToken();
    const response = await this.fetchWithTimeout(`${this.apiBaseUrl}/v2/checkout/orders/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`PayPal payment confirmation failed: ${response.status} ${body}`);
    }

    const body = (await response.json()) as PayPalOrderResponse;
    const isCompleted = body.status === 'COMPLETED';
    const hasCapturedPayment = body.purchase_units?.some((purchaseUnit) =>
      purchaseUnit.payments?.captures?.some((capture) => capture.status === 'COMPLETED')
    );

    if (!isCompleted && !hasCapturedPayment) {
      throw new Error(`PayPal payment is not completed yet. Current status: ${body.status}`);
    }
  }

  public async verifyWebhookSignature(
    rawBody: string,
    headers: Record<string, string | undefined>
  ): Promise<boolean> {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      throw new Error('PAYPAL_WEBHOOK_ID is required for PayPal webhook verification.');
    }

    const accessToken = await this.getAccessToken();
    const payload = {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody)
    };

    if (
      !payload.auth_algo ||
      !payload.cert_url ||
      !payload.transmission_id ||
      !payload.transmission_sig ||
      !payload.transmission_time
    ) {
      throw new Error('Missing PayPal webhook signature headers.');
    }

    const response = await this.fetchWithTimeout(`${this.apiBaseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`PayPal webhook verification failed: ${response.status} ${body}`);
    }

    const verification = await response.json();
    return verification.verification_status === 'SUCCESS';
  }

  public extractOrderIdFromWebhook(event: unknown): string | null {
    if (!event || typeof event !== 'object') {
      return null;
    }

    const evt = event as Record<string, unknown>;
    const eventType = typeof evt.event_type === 'string' ? evt.event_type : '';
    if (!['PAYMENT.CAPTURE.COMPLETED', 'CHECKOUT.ORDER.COMPLETED'].includes(eventType)) {
      return null;
    }

    const resource = evt.resource as Record<string, unknown> | undefined;
    if (!resource) {
      return null;
    }

    const supplementaryData = resource.supplementary_data as Record<string, unknown> | undefined;
    const relatedIds = supplementaryData?.related_ids as Record<string, unknown> | undefined;
    const orderId =
      (relatedIds?.order_id as string | undefined) ||
      (resource.order_id as string | undefined) ||
      (resource.id as string | undefined);

    return typeof orderId === 'string' ? orderId : null;
  }

  public extractAmountFromWebhook(event: unknown): number {
    if (!event || typeof event !== 'object') {
      return 0;
    }

    const evt = event as Record<string, unknown>;
    const resource = evt.resource as Record<string, unknown> | undefined;
    const amount = resource?.amount as Record<string, unknown> | undefined;
    const value = amount?.value as string | undefined;

    return value ? Number.parseFloat(value) : 0;
  }

  public extractCurrencyFromWebhook(event: unknown): string | null {
    if (!event || typeof event !== 'object') {
      return null;
    }

    const evt = event as Record<string, unknown>;
    const resource = evt.resource as Record<string, unknown> | undefined;
    const amount = resource?.amount as Record<string, unknown> | undefined;
    const currency = amount?.currency_code as string | undefined;

    return typeof currency === 'string' ? currency : null;
  }

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await this.fetchWithTimeout(`${this.apiBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`PayPal token request failed: ${response.status} ${body}`);
    }

    const payload = await response.json();
    if (!payload.access_token || typeof payload.access_token !== 'string') {
      throw new Error('PayPal token response did not include an access token.');
    }

    return payload.access_token;
  }
}
