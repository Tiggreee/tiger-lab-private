import { DomainEvent } from '../../../../../shared/domain/events/DomainEvent';

/** Lead external service output ports. */
export interface LeadScoringApiPort {
  score(leadId: string, rawScore: number): Promise<number>;
}

export interface LeadQueuePort {
  enqueue(leadId: string): Promise<void>;
}

export interface LeadDomainEventPublisherPort {
  publish(event: DomainEvent<unknown>): Promise<void>;
}
