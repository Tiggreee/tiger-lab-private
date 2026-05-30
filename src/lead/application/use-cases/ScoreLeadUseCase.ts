import { LeadScore as LeadScoreEntity } from '../../domain/entities/LeadScore';
import { LeadScoredEvent } from '../../domain/events/LeadScoredEvent';
import { LeadId } from '../../../../shared/domain/value-objects/LeadId';
import { LeadScore } from '../../../../shared/domain/value-objects/LeadScore';
import { ScoreLeadCommand } from '../ports/in/commands';
import { ScoreLeadCommandHandler } from '../ports/in/handlers';
import { LeadRepositoryPort } from '../ports/out/repositories';
import { LeadDomainEventPublisherPort } from '../ports/out/external';
import { trackFunnelEvent } from '../../../../shared/infrastructure/observability/funnel-telemetry';

/** Score lead use case. */
export class ScoreLeadUseCase implements ScoreLeadCommandHandler {
  constructor(
    private readonly leadRepository: LeadRepositoryPort,
    private readonly eventPublisher: LeadDomainEventPublisherPort
  ) {}

  public async execute(command: ScoreLeadCommand): Promise<void> {
    const lead = await this.leadRepository.findLeadById(command.leadId);
    if (!lead) {
      throw new Error('Lead not found.');
    }

    const scoreValue = new LeadScore(command.score);
    lead.applyScore(scoreValue);

    if (!lead.canAdvance()) {
      throw new Error('Lead cannot advance without a valid score.');
    }

    const scoreRecord = new LeadScoreEntity(new LeadId(command.leadId), scoreValue);
    await this.leadRepository.saveLead(lead);
    await this.leadRepository.saveLeadScore(scoreRecord);

    const event = new LeadScoredEvent({
      leadId: command.leadId,
      score: scoreValue.value
    });

    await this.eventPublisher.publish(event);
    await trackFunnelEvent('lead_scored', {
      leadId: command.leadId,
      score: scoreValue.value
    });
  }
}
