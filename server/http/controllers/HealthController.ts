import { HealthResponse } from '../contracts/responses/health-response';

export class HealthController {
  public async getHealth(): Promise<HealthResponse> {
    return {
      status: 'ok',
      service: 'copilot-server-mode',
      time: new Date().toISOString()
    };
  }
}
