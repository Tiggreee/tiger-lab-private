import { HttpRoute } from '../types';

export class Router {
  private readonly routes: HttpRoute[] = [];

  public register(route: HttpRoute): void {
    this.routes.push(route);
  }

  public registerMany(routes: readonly HttpRoute[]): void {
    routes.forEach((route) => this.register(route));
  }

  public resolve(method: string, path: string): HttpRoute | undefined {
    return this.routes.find((route) => route.method === method && route.path === path);
  }
}
