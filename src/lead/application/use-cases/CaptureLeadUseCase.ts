import { Lead } from '../../domain/entities/Lead';
import { LeadCreatedEvent } from '../../domain/events/LeadCreatedEvent';
import { LeadId } from '../../../shared/domain/value-objects/LeadId';
import { CaptureLeadCommand } from '../ports/in/commands';
import { CaptureLeadCommandHandler } from '../ports/in/handlers';
import { LeadRepositoryPort } from '../ports/out/repositories';
import { LeadDomainEventPublisherPort } from '../ports/out/external';
import { trackFunnelEvent } from '../../../shared/infrastructure/observability/funnel-telemetry';

/** Capture lead use case. */
export class CaptureLeadUseCase implements CaptureLeadCommandHandler {
  constructor(
    private readonly leadRepository: LeadRepositoryPort,
    private readonly eventPublisher: LeadDomainEventPublisherPort
  ) {}

  public async execute(command: CaptureLeadCommand): Promise<void> {
    const lead = new Lead(new LeadId(command.leadId), command.source);
    await this.leadRepository.saveLead(lead);

    const event = new LeadCreatedEvent({
      leadId: lead.leadId.value(),
      source: lead.source
    });

    await this.eventPublisher.publish(event);
    await trackFunnelEvent('lead_captured', {
      leadId: lead.leadId.value(),
      source: lead.source
    });
  }
}
