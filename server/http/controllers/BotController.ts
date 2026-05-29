import { randomUUID } from 'node:crypto';
import { ResolveOfferUseCase } from '../../../src/catalog/application/use-cases/ResolveOfferUseCase';
import { ScoreLeadUseCase } from '../../../src/lead/application/use-cases/ScoreLeadUseCase';
import { BotQueryRequest } from '../contracts/requests/bot-query-request';
import { BotQueryResponse } from '../contracts/responses/bot-query-response';

export class BotController {
  constructor(
    private readonly resolveOfferUseCase: ResolveOfferUseCase,
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

    await this.scoreLeadUseCase.execute({
      leadId,
      score: request.score ?? 50
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
}
