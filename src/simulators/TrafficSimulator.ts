import { createEventEnvelope } from '../monetization/core/EventEnvelope';
import { InMemoryEventBus } from '../monetization/core/InMemoryEventBus';
import { LeadCaptureOrchestrator } from '../lead/engine/LeadCaptureOrchestrator';

export class TrafficSimulator {
  constructor(
    private readonly eventBus: InMemoryEventBus,
    private readonly leadCaptureOrchestrator: LeadCaptureOrchestrator
  ) {}

  public async simulate(channel: string, visits: number): Promise<void> {
    for (let index = 0; index < visits; index += 1) {
      await this.eventBus.publish(
        createEventEnvelope('traffic.visit', 'TrafficSimulator', {
          channel,
          visitId: `visit_${channel}_${index}`
        })
      );

      if (index % 2 === 0) {
        await this.leadCaptureOrchestrator.capture(channel, 'simulated-traffic', 45 + (index % 50));
      }
    }
  }
}
