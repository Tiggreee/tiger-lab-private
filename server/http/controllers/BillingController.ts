import { randomUUID } from 'node:crypto';
import { RegisterPaymentUseCase } from '../../../src/billing/application/use-cases/RegisterPaymentUseCase';
import { ProvisionAccountUseCase } from '../../../src/billing/application/use-cases/ProvisionAccountUseCase';
import { PayPalPaymentService } from '../../bootstrap/paypal-payment-service';
import { StripePaymentService } from '../../bootstrap/stripe-payment-service';
import { HttpError } from '../errors';
import { CreateCheckoutSessionRequest } from '../contracts/requests/create-checkout-session-request';
import { CreateCheckoutSessionResponse } from '../contracts/responses/create-checkout-session-response';
import { ProvisionProductRequest } from '../contracts/requests/provision-product-request';
import { ProvisionProductResponse } from '../contracts/responses/provision-product-response';
import { RegisterPaymentRequest } from '../contracts/requests/register-payment-request';
import { RegisterPaymentResponse } from '../contracts/responses/register-payment-response';
import { InvoiceAutomationService } from '../../bootstrap/invoice-automation-service';

export class BillingController {
  private static extractEmailFromWebhookEvent(webhookEvent: Record<string, unknown>): string | undefined {
    const resource = webhookEvent.resource as Record<string, unknown> | undefined;
    if (!resource) {
      return undefined;
    }

    const payer = resource.payer as Record<string, unknown> | undefined;
    const payerEmail = typeof payer?.email_address === 'string' ? payer.email_address : undefined;
    if (payerEmail) {
      return payerEmail;
    }

    const supplementaryData = resource.supplementary_data as Record<string, unknown> | undefined;
    const relatedIds = supplementaryData?.related_ids as Record<string, unknown> | undefined;
    const buyerEmail = typeof relatedIds?.buyer_email === 'string' ? relatedIds.buyer_email : undefined;
    return buyerEmail;
  }

  constructor(
    private readonly registerPaymentUseCase: RegisterPaymentUseCase,
    private readonly provisionAccountUseCase: ProvisionAccountUseCase,
    private readonly payPalPaymentService?: PayPalPaymentService,
    private readonly stripePaymentService?: StripePaymentService,
    private readonly invoiceAutomationService?: InvoiceAutomationService
  ) {}

  public async registerPayment(request: RegisterPaymentRequest): Promise<RegisterPaymentResponse> {
    const paymentId = request.paymentId || `pay_${randomUUID().slice(0, 8)}`;
    const customerId = request.customerId || 'customer-demo';
    const productId = request.productId || 'facturautentico-cloud';
    const planId = request.planId || 'starter';
    const amount = request.amount ?? 39;
    const currency = request.currency || 'USD';

    await this.registerPaymentUseCase.execute({
      paymentId,
      customerId,
      productId,
      planId,
      amount,
      currency
    });

    const invoice = this.invoiceAutomationService
      ? await this.invoiceAutomationService.issueAndNotify({
          paymentId,
          customerId,
          productId,
          planId,
          amount,
          currency,
          buyerEmail: request.buyerEmail,
          sellerEmail: request.sellerEmail,
          accountantEmail: request.accountantEmail
        })
      : {
          status: 'skipped' as const,
          detail: 'Invoice automation service is not configured.',
          recipients: []
        };

    return {
      status: 'ok',
      action: 'register-payment',
      result: {
        paymentId,
        customerId,
        productId,
        planId,
        amount,
        currency,
        dryRun: request.dryRun !== false,
        invoice
      }
    };
  }

  public async createCheckoutSession(request: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse> {
    const provider = request.provider || 'stripe';
    const productId = request.productId || 'docflow-api';
    const planId = request.planId || 'starter';
    const amount = request.amount ?? 39;
    const currency = (request.currency || 'USD').toUpperCase();
    const returnUrl = request.returnUrl || process.env.PAYPAL_RETURN_URL || process.env.STRIPE_RETURN_URL;
    const cancelUrl = request.cancelUrl || process.env.PAYPAL_CANCEL_URL || process.env.STRIPE_CANCEL_URL;

    if (!returnUrl || !cancelUrl) {
      throw new HttpError(500, 'Return and cancel URLs must be configured (PAYPAL_RETURN_URL / STRIPE_RETURN_URL).');
    }

    if (returnUrl.includes('example.com') || cancelUrl.includes('example.com')) {
      throw new HttpError(500, 'Redirect URLs cannot use example.com placeholders.');
    }

    if (provider === 'stripe') {
      if (!this.stripePaymentService) {
        throw new Error('Stripe is not configured in the server.');
      }
      const session = await this.stripePaymentService.createCheckoutSession(amount, currency, returnUrl, cancelUrl, productId);
      return {
        status: 'ok',
        action: 'create-checkout-session',
        result: {
          sessionId: session.sessionId,
          approvalUrl: session.url,
          amount: session.amount,
          currency: session.currency,
          productId,
          planId,
          provider: 'stripe'
        }
      };
    }

    if (!this.payPalPaymentService) {
      throw new Error('PayPal is not configured in the server.');
    }
    const session = await this.payPalPaymentService.createCheckoutSession(amount, currency, returnUrl, cancelUrl);

    return {
      status: 'ok',
      action: 'create-checkout-session',
      result: {
        sessionId: session.sessionId,
        approvalUrl: session.approvalUrl,
        amount: session.amount,
        currency: session.currency,
        productId,
        planId,
        provider: 'paypal'
      }
    };
  }

  public async handleStripeWebhook(rawBody: string, signature: string | undefined): Promise<{
    status: 'ok';
    action: 'stripe-webhook';
    result: {
      paymentId: string;
      invoice: {
        status: 'issued' | 'skipped' | 'failed';
        detail: string;
        cfdiUuid?: string;
        recipients: readonly string[];
      };
    };
  }> {
    if (!this.stripePaymentService) {
      throw new Error('Stripe is not configured in the server.');
    }

    if (!signature) {
      throw new HttpError(401, 'Missing Stripe signature header.');
    }

    const verified = this.stripePaymentService.verifyWebhookSignature(rawBody, signature);
    if (!verified) {
      throw new HttpError(401, 'Invalid Stripe webhook signature.');
    }

    const webhookEvent = JSON.parse(rawBody) as Record<string, unknown>;
    const eventType = webhookEvent.type as string;
    if (eventType !== 'checkout.session.completed') {
      throw new Error(`Unhandled Stripe event type: ${eventType}`);
    }

    const sessionId = webhookEvent.id as string;
    const paymentIntent = this.stripePaymentService.extractPaymentIntentFromWebhook(webhookEvent);
    const paymentId = paymentIntent || sessionId;
    const amount = this.stripePaymentService.extractAmountFromWebhook(webhookEvent);
    const currency = this.stripePaymentService.extractCurrencyFromWebhook(webhookEvent) ?? 'usd';
    const customerId = `stripe-${paymentId}`;

    await this.registerPaymentUseCase.execute({
      paymentId,
      customerId,
      productId: 'docflow-api',
      planId: 'starter',
      amount,
      currency
    });

    const invoice = this.invoiceAutomationService
      ? await this.invoiceAutomationService.issueAndNotify({
          paymentId,
          customerId,
          productId: 'docflow-api',
          planId: 'starter',
          amount,
          currency
        })
      : {
          status: 'skipped' as const,
          detail: 'Invoice automation service is not configured.',
          recipients: []
        };

    return {
      status: 'ok',
      action: 'stripe-webhook',
      result: {
        paymentId,
        invoice
      }
    };
  }

  public async handlePayPalWebhook(rawBody: string, headers: Record<string, string | undefined>): Promise<{
    status: 'ok';
    action: 'paypal-webhook';
    result: {
      paymentId: string;
      invoice: {
        status: 'issued' | 'skipped' | 'failed';
        detail: string;
        cfdiUuid?: string;
        recipients: readonly string[];
      };
    };
  }> {
    if (!this.payPalPaymentService) {
      throw new Error('PayPal is not configured in the server.');
    }

    const verified = await this.payPalPaymentService.verifyWebhookSignature(rawBody, headers);
    if (!verified) {
      throw new HttpError(401, 'Invalid PayPal webhook signature.');
    }

    const webhookEvent = JSON.parse(rawBody) as Record<string, unknown>;
    const orderId = this.payPalPaymentService.extractOrderIdFromWebhook(webhookEvent);
    if (!orderId) {
      throw new Error('PayPal order ID not found in webhook event.');
    }

    const amount = this.payPalPaymentService.extractAmountFromWebhook(webhookEvent);
    const currency = this.payPalPaymentService.extractCurrencyFromWebhook(webhookEvent) ?? 'USD';
    const customerId = `paypal-${orderId}`;
    const buyerEmail = BillingController.extractEmailFromWebhookEvent(webhookEvent);
    const productId = 'facturautentico-cloud';
    const planId = 'starter';

    await this.registerPaymentUseCase.execute({
      paymentId: orderId,
      customerId,
      productId,
      planId,
      amount,
      currency
    });

    const invoice = this.invoiceAutomationService
      ? await this.invoiceAutomationService.issueAndNotify({
          paymentId: orderId,
          customerId,
          productId,
          planId,
          amount,
          currency,
          buyerEmail
        })
      : {
          status: 'skipped' as const,
          detail: 'Invoice automation service is not configured.',
          recipients: []
        };

    return {
      status: 'ok',
      action: 'paypal-webhook',
      result: {
        paymentId: orderId,
        invoice
      }
    };
  }

  public async provisionProduct(request: ProvisionProductRequest): Promise<ProvisionProductResponse> {
    const product = request.product || 'unknown-product';
    const accountId = request.accountId || `acct_${randomUUID().slice(0, 8)}`;
    const paymentId = request.paymentId || `pay_${randomUUID().slice(0, 8)}`;

    await this.provisionAccountUseCase.execute({
      accountId,
      paymentId
    });

    return {
      status: 'ok',
      action: 'provision-product',
      result: {
        accountId,
        userId: request.userId || 'anonymous',
        product,
        apiKeyHint: `${product.slice(0, 4)}_***`,
        dryRun: request.dryRun !== false
      }
    };
  }
}
