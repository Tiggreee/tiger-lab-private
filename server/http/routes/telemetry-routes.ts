import { TelemetryController } from '../controllers/TelemetryController';
import { HttpRoute } from '../types';

export function buildTelemetryRoutes(controller: TelemetryController): readonly HttpRoute[] {
  return [
    {
      method: 'GET',
      path: '/runtime/telemetry',
      handler: async (ctx) => {
        await controller.getStats(ctx.req, ctx.res);
      }
    }
  ];
}
