import { BillingController } from '../controllers/BillingController';
import { validateRegisterPaymentRequest } from '../contracts/validators/validate-register-payment-request';
import { validateProvisionProductRequest } from '../contracts/validators/validate-provision-product-request';
import { sendJson } from '../response';
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
    }
  ];
}
