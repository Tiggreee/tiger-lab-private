import { randomUUID } from 'node:crypto';
import { ResolveOfferUseCase } from '../../../src/catalog/application/use-cases/ResolveOfferUseCase';
import { CaptureLeadUseCase } from '../../../src/lead/application/use-cases/CaptureLeadUseCase';
import { ScoreLeadUseCase } from '../../../src/lead/application/use-cases/ScoreLeadUseCase';
import { BotQueryRequest } from '../contracts/requests/bot-query-request';
import { ConversationEntryRequest } from '../contracts/requests/conversation-entry-request';
import { BotQueryResponse } from '../contracts/responses/bot-query-response';
import { ConversationEntryResponse } from '../contracts/responses/conversation-entry-response';
import { trackFunnelEvent } from '../../../src/shared/infrastructure/observability/funnel-telemetry';

export class BotController {
  constructor(
    private readonly resolveOfferUseCase: ResolveOfferUseCase,
    private readonly captureLeadUseCase: CaptureLeadUseCase,
    private readonly scoreLeadUseCase: ScoreLeadUseCase
  ) {}

  public async botQuery(request: BotQueryRequest): Promise<BotQueryResponse> {
    const leadId = request.leadId || `lead_${randomUUID().slice(0, 8)}`;

    // Wiring requested for phase 3: resolve offer and score lead.
    await this.resolveOfferUseCase.execute({
      productId: request.productId || 'facturautentico-cloud',
      planId: request.planId || 'starter',
      at: new Date()
    });

    await this.captureLeadUseCase.execute({
      leadId,
      source: 'bot'
    });

    await this.scoreLeadUseCase.execute({
      leadId,
      score: request.score ?? 50
    });

    await trackFunnelEvent('bot_query', {
      leadId,
      productId: request.productId || 'facturautentico-cloud',
      planId: request.planId || 'starter',
      score: request.score ?? 50,
      dryRun: request.dryRun !== false
    });

    const message = request.message || '';

    return {
      status: 'ok',
      action: 'bot-query',
      result: {
        reply: message ? `Auto-response generated for: ${message.slice(0, 120)}` : 'Auto-response generated.',
        recommendation: 'start_trial',
        dryRun: request.dryRun !== false
      }
    };
  }

  public async conversationEntry(request: ConversationEntryRequest): Promise<ConversationEntryResponse> {
    const leadId = request.leadId || `lead_${randomUUID().slice(0, 8)}`;
    const channel = request.channel || 'whatsapp';
    const destination = (request.destination || process.env.SOCIAL_CLOSE_DESTINATION || '').trim();
    const message =
      request.message ||
      'Hola, vengo de la campana y quiero activar el diagnostico express de 15 min.';

    let entryLink = '';

    if (channel === 'whatsapp') {
      const phone = destination.replace(/[^\d]/g, '');
      entryLink = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : '';
    } else if (channel === 'calendar' || channel === 'landing') {
      entryLink = destination;
    } else {
      entryLink = destination;
    }

    await trackFunnelEvent('conversation_entry', {
      leadId,
      channel,
      destination,
      entryLink
    });

    return {
      status: 'ok',
      action: 'conversation-entry',
      result: {
        leadId,
        channel,
        destination,
        message,
        entryLink
      }
    };
  }
}
