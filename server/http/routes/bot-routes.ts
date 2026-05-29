import { BotController } from '../controllers/BotController';
import { validateBotQueryRequest } from '../contracts/validators/validate-bot-query-request';
import { sendJson } from '../response';
import { HttpRoute } from '../types';

export function buildBotRoutes(controller: BotController): readonly HttpRoute[] {
  return [
    {
      method: 'POST',
      path: '/bot-query',
      requiredScopes: ['bot:query'],
      enableIdempotency: true,
      handler: async (ctx) => {
        const request = validateBotQueryRequest(ctx.body);
        const response = await controller.botQuery(request);
        sendJson(ctx.res, 200, response);
      }
    }
  ];
}
