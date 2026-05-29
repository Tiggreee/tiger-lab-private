export interface HealthResponse {
  readonly status: 'ok';
  readonly service: string;
  readonly time: string;
}
