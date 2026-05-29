/**
 * Application bootstrap entrypoint.
 * Phase 1: structure only, no runtime initialization.
 */
import { createDependencyContainer, type DependencyContainer } from './dependency-container';

export interface AppBootstrapResult {
  readonly container: DependencyContainer;
}

export function bootstrapApplication(): AppBootstrapResult {
  const container = createDependencyContainer();

  return {
    container
  };
}
