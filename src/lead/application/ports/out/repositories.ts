import { Lead } from '../../../domain/entities/Lead';
import { LeadScore } from '../../../domain/entities/LeadScore';

/** Lead repository output ports. */
export interface LeadRepositoryPort {
  saveLead(lead: Lead): Promise<void>;
  saveLeadScore(leadScore: LeadScore): Promise<void>;
  findLeadById(leadId: string): Promise<Lead | null>;
}
