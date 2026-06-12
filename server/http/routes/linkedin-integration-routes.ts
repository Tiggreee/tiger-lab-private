import { LinkedInIntegrationController } from '../controllers/LinkedInIntegrationController';
import { sendJson } from '../response';
import { HttpRoute } from '../types';

export function buildLinkedInIntegrationRoutes(
  controller: LinkedInIntegrationController
): readonly HttpRoute[] {
  return [
    {
      method: 'GET',
      path: '/integrations/linkedin/oauth/start',
      handler: async (ctx) => {
        const response = await controller.startOAuth();
        sendJson(ctx.res, 200, response);
      }
    },
    {
      method: 'GET',
      path: '/integrations/linkedin/oauth/callback',
      handler: async (ctx) => {
        const url = new URL(ctx.req.url || '/', 'http://localhost');
        const response = await controller.handleOAuthCallback(url.searchParams);
        sendJson(ctx.res, 200, response);
      }
    },
    {
      method: 'GET',
      path: '/integrations/linkedin/analytics',
      requiredScopes: ['linkedin:analytics:read'],
      handler: async (ctx) => {
        const url = new URL(ctx.req.url || '/', 'http://localhost');
        const response = await controller.getCampaignAnalytics(url.searchParams);
        sendJson(ctx.res, 200, response);
      }
    }
  ];
}
