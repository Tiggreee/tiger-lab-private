import { LeadId } from '../../../shared/domain/value-objects/LeadId';
import { LeadScore } from '../../../shared/domain/value-objects/LeadScore';

/** Lead entity. */
export class Lead {
  public readonly leadId: LeadId;
  public readonly source: string;
  public readonly createdAt: Date;
  private score?: LeadScore;

  constructor(leadId: LeadId, source: string, createdAt = new Date()) {
    if (!source.trim()) {
      throw new Error('Lead source cannot be empty.');
    }

    this.leadId = leadId;
    this.source = source;
    this.createdAt = createdAt;
  }

  public applyScore(score: LeadScore): void {
    this.score = score;
  }

  public canAdvance(minimumScore = 1): boolean {
    return this.score?.isValidForProgression(minimumScore) ?? false;
  }

  public getScore(): LeadScore | undefined {
    return this.score;
  }
}
