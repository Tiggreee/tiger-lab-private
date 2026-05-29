import { CausationId } from '../value-objects/CausationId';
import { CorrelationId } from '../value-objects/CorrelationId';
import { Version } from '../value-objects/Version';

/** Minimal domain event contract. */
export interface DomainEvent<TPayload> {
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly correlationId?: CorrelationId;
  readonly causationId?: CausationId;
  readonly version: Version;
  readonly payload: TPayload;
}
