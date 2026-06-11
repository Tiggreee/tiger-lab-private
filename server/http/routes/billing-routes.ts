import { BillingController } from '../controllers/BillingController';
import { validateCreateCheckoutSessionRequest } from '../contracts/validators/validate-create-checkout-session-request';
import { validateRegisterPaymentRequest } from '../contracts/validators/validate-register-payment-request';
import { validateProvisionProductRequest } from '../contracts/validators/validate-provision-product-request';
import { sendJson } from '../response';
import { getHeader } from '../request-utils';
import { HttpRoute } from '../types';

export function buildBillingRoutes(controller: BillingController): readonly HttpRoute[] {
  return [
    {
      method: 'POST',
      path: '/provision-product',
      requiredScopes: ['billing:provision'],
      enableIdempotency: true,
      handler: async (ctx) => {
        const request = validateProvisionProductRequest(ctx.body);
        const response = await controller.provisionProduct(request);
        sendJson(ctx.res, 200, response);
      }
    },
    {
      method: 'POST',
      path: '/register-payment',
      requiredScopes: ['billing:register'],
      enableIdempotency: true,
      handler: async (ctx) => {
        const request = validateRegisterPaymentRequest(ctx.body);
        const response = await controller.registerPayment(request);
        sendJson(ctx.res, 200, response);
      }
    },
    {
      method: 'POST',
      path: '/billing/checkout/session',
      requiredScopes: ['billing:checkout'],
      handler: async (ctx) => {
        const request = validateCreateCheckoutSessionRequest(ctx.body);
        const response = await controller.createCheckoutSession(request);
        sendJson(ctx.res, 200, response);
      }
    },
    {
      method: 'POST',
      path: '/billing/webhooks/paypal',
      handler: async (ctx) => {
        const rawBody = ctx.rawBody ?? '';

        const headers = {
          'paypal-transmission-id': getHeader(ctx.req, 'paypal-transmission-id'),
          'paypal-transmission-time': getHeader(ctx.req, 'paypal-transmission-time'),
          'paypal-transmission-sig': getHeader(ctx.req, 'paypal-transmission-sig'),
          'paypal-cert-url': getHeader(ctx.req, 'paypal-cert-url'),
          'paypal-auth-algo': getHeader(ctx.req, 'paypal-auth-algo')
        };

        const response = await controller.handlePayPalWebhook(rawBody, headers);
        sendJson(ctx.res, 200, response);
      }
    }
  ];
}
