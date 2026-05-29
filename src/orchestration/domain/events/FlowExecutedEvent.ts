import { DomainEvent } from '../../../shared/domain/events/DomainEvent';
import { Version } from '../../../shared/domain/value-objects/Version';

export interface FlowExecutedPayload {
  readonly flowId: string;
  readonly status: 'completed' | 'failed';
}

/** flow.executed domain event. */
export class FlowExecutedEvent implements DomainEvent<FlowExecutedPayload> {
  public readonly eventType = 'flow.executed';
  public readonly occurredAt = new Date();
  public readonly version = new Version('1.0.0');

  constructor(public readonly payload: FlowExecutedPayload) {}
}
