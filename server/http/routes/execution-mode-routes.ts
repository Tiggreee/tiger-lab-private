import { ExecutionModeController } from '../controllers/ExecutionModeController';
import { HttpRoute } from '../types';

export function buildExecutionModeRoutes(controller: ExecutionModeController): readonly HttpRoute[] {
  return [
    {
      method: 'GET',
      path: '/runtime/execution-modes.json',
      handler: async (ctx) => {
        await controller.getCurrent(ctx.req, ctx.res);
      }
    },
    {
      method: 'POST',
      path: '/runtime/execution-mode/toggle',
      handler: async (ctx) => {
        await controller.toggle(ctx.req, ctx.res);
      }
    },
    {
      method: 'GET',
      path: '/runtime/execution-mode/guardrails',
      handler: async (ctx) => {
        await controller.getGuardrails(ctx.req, ctx.res);
      }
    },
    {
      method: 'POST',
      path: '/runtime/tasks/resume',
      handler: async (ctx) => {
        await controller.resumeTask(ctx.req, ctx.res);
      }
    }
  ];
}
