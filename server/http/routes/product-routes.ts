import { ProductController } from '../controllers/ProductController';
import { validateGenerateProductRequest } from '../contracts/validators/validate-generate-product-request';
import { sendJson } from '../response';
import { HttpRoute } from '../types';

export function buildProductRoutes(controller: ProductController): readonly HttpRoute[] {
  return [
    {
      method: 'POST',
      path: '/generate-product',
      requiredScopes: ['product:generate'],
      enableIdempotency: true,
      handler: async (ctx) => {
        const request = validateGenerateProductRequest(ctx.body);
        const response = await controller.generateProduct(request);
        sendJson(ctx.res, 200, response);
      }
    }
  ];
}
