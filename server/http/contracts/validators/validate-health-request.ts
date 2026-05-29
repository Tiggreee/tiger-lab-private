import { HealthRequest } from '../requests/health-request';

export function validateHealthRequest(payload: unknown): HealthRequest {
  const candidate = (payload ?? {}) as HealthRequest;
  return candidate;
}
