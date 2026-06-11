export interface HealthDependencyStatus {
  readonly status: 'up' | 'down' | 'skipped';
  readonly detail?: string;
}

export interface HealthResponse {
  readonly status: 'ok' | 'degraded';
  readonly service: string;
  readonly time: string;
  readonly dependencies: Record<string, HealthDependencyStatus>;
}
