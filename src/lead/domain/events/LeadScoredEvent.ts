import { DomainEvent } from '../../../shared/domain/events/DomainEvent';
import { Version } from '../../../shared/domain/value-objects/Version';

export interface LeadScoredPayload {
  readonly leadId: string;
  readonly score: number;
}

/** lead.scored domain event. */
export class LeadScoredEvent implements DomainEvent<LeadScoredPayload> {
  public readonly eventType = 'lead.scored';
  public readonly occurredAt = new Date();
  public readonly version = new Version('1.0.0');

  constructor(public readonly payload: LeadScoredPayload) {}
}
