import { describe, expect, it } from 'vitest';
import { Lead } from '../../../src/lead/domain/entities/Lead';
import { LeadId } from '../../../src/shared/domain/value-objects/LeadId';
import { LeadScore } from '../../../src/shared/domain/value-objects/LeadScore';

describe('Lead entity and score value object', () => {
  it('rejects out-of-range lead score', () => {
    expect(() => new LeadScore(101)).toThrowError('LeadScore must be a number between 0 and 100.');
  });

  it('allows progression when score is applied', () => {
    const lead = new Lead(new LeadId('lead-1'), 'web');
    lead.applyScore(new LeadScore(75));

    expect(lead.canAdvance(50)).toBe(true);
    expect(lead.getScore()?.value).toBe(75);
  });
});
