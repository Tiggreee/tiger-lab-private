import { HttpRequestContext, Middleware } from '../types';

export async function runMiddlewareChain(
  ctx: HttpRequestContext,
  middlewareList: readonly Middleware[],
  terminal: () => Promise<void>
): Promise<void> {
  let index = -1;

  const dispatch = async (current: number): Promise<void> => {
    if (current <= index) {
      throw new Error('next() called multiple times.');
    }

    index = current;
    const middleware = middlewareList[current];

    if (!middleware) {
      await terminal();
      return;
    }

    await middleware(ctx, async () => dispatch(current + 1));
  };

  await dispatch(0);
}
