import { ModelController } from '../controllers/ModelController';
import { HttpRoute } from '../types';

export function buildModelRoutes(controller: ModelController): readonly HttpRoute[] {
  return [
    {
      method: 'GET',
      path: '/runtime/models',
      handler: async (ctx) => {
        await controller.list(ctx.req, ctx.res);
      }
    },
    {
      method: 'POST',
      path: '/runtime/models',
      handler: async (ctx) => {
        await controller.add(ctx.req, ctx.res);
      }
    },
    {
      method: 'DELETE',
      path: '/runtime/models/:id',
      handler: async (ctx) => {
        await controller.remove(ctx.req, ctx.res);
      }
    }
  ];
}
