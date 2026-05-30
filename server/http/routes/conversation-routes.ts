import { BotController } from '../controllers/BotController';
import { validateConversationEntryRequest } from '../contracts/validators/validate-conversation-entry-request';
import { sendJson } from '../response';
import { HttpRoute } from '../types';

export function buildConversationRoutes(controller: BotController): readonly HttpRoute[] {
  return [
    {
      method: 'POST',
      path: '/conversation-entry',
      requiredScopes: ['bot:query'],
      enableIdempotency: true,
      handler: async (ctx) => {
        const request = validateConversationEntryRequest(ctx.body);
        const response = await controller.conversationEntry(request);
        sendJson(ctx.res, 200, response);
      }
    }
  ];
}
