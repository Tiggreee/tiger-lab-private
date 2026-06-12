import { HealthController } from '../controllers/HealthController';
import { sendJson } from '../response';
import { HttpRoute } from '../types';

export function buildHealthRoutes(controller: HealthController): readonly HttpRoute[] {
  return [
    {
      method: 'GET',
      path: '/health',
      handler: async (ctx) => {
        const body = await controller.getHealth();
        sendJson(ctx.res, 200, body);
      }
    }
  ];
}
