import { LeadId } from '../../../shared/domain/value-objects/LeadId';
import { LeadScore as LeadScoreValue } from '../../../shared/domain/value-objects/LeadScore';

/** LeadScore entity (historical score record). */
export class LeadScore {
  public readonly leadId: LeadId;
  public readonly value: LeadScoreValue;
  public readonly scoredAt: Date;

  constructor(leadId: LeadId, value: LeadScoreValue, scoredAt = new Date()) {
    this.leadId = leadId;
    this.value = value;
    this.scoredAt = scoredAt;
  }
}
