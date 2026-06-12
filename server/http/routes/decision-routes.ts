import { DecisionController } from '../controllers/DecisionController';
import { sendJson } from '../response';
import { HttpRoute } from '../types';

export function buildDecisionRoutes(controller: DecisionController): readonly HttpRoute[] {
  return [
    {
      method: 'POST',
      path: '/decisions',
      requiredScopes: ['decisions:write'],
      enableIdempotency: false,
      handler: async (ctx) => {
        const response = await controller.handle(ctx.body as any);
        sendJson(ctx.res, response.status === 'ok' ? 200 : 400, response);
      },
    },
    {
      method: 'GET',
      path: '/decisions',
      requiredScopes: ['decisions:read'],
      handler: async (ctx) => {
        const response = await controller.handle({ action: 'get-decisions' });
        sendJson(ctx.res, 200, response);
      },
    },
    {
      method: 'GET',
      path: '/decisions/pending',
      requiredScopes: ['decisions:read'],
      handler: async (ctx) => {
        const response = await controller.handle({ action: 'get-pending' });
        sendJson(ctx.res, 200, response);
      },
    },
    {
      method: 'GET',
      path: '/decisions/report',
      requiredScopes: ['decisions:read'],
      handler: async (ctx) => {
        const response = await controller.handle({ action: 'get-report' });
        sendJson(ctx.res, 200, response);
      },
    },
  ];
}
