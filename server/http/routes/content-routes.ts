import { ContentController } from '../controllers/ContentController';
import { validateGenerateContentRequest } from '../contracts/validators/validate-generate-content-request';
import { sendJson } from '../response';
import { HttpRoute } from '../types';

export function buildContentRoutes(controller: ContentController): readonly HttpRoute[] {
  return [
    {
      method: 'POST',
      path: '/generate-content',
      requiredScopes: ['content:generate'],
      enableIdempotency: true,
      handler: async (ctx) => {
        const request = validateGenerateContentRequest(ctx.body);
        const response = await controller.generateContent(request);
        sendJson(ctx.res, 200, response);
      }
    }
  ];
}
