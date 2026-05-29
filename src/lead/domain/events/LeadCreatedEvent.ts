import { DomainEvent } from '../../../shared/domain/events/DomainEvent';
import { Version } from '../../../shared/domain/value-objects/Version';

export interface LeadCreatedPayload {
  readonly leadId: string;
  readonly source: string;
}

/** lead.created domain event. */
export class LeadCreatedEvent implements DomainEvent<LeadCreatedPayload> {
  public readonly eventType = 'lead.created';
  public readonly occurredAt = new Date();
  public readonly version = new Version('1.0.0');

  constructor(public readonly payload: LeadCreatedPayload) {}
}
