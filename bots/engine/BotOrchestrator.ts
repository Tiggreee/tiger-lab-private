import { BotInput } from '../contracts/bot-input.schema';
import { BotOutput } from '../contracts/bot-output.schema';
import { getChannelPolicy } from '../contracts/channel-policy.schema';
import { classifyIntent } from './intent-classifier';
import {
  DecideCommercialActionInput,
  DecideCommercialActionUseCase
} from '../../src/orchestration/application/use-cases/DecideCommercialActionUseCase';

export class BotOrchestrator {
  constructor(
    private readonly decideCommercialActionUseCase: DecideCommercialActionUseCase = new DecideCommercialActionUseCase()
  ) {}

  public execute(input: BotInput): BotOutput {
    const intent = classifyIntent(input.message);
    const policy = getChannelPolicy(input.channel);

    const commercialInput: DecideCommercialActionInput = {
      leadScore: input.leadScore,
      requestedProductId: input.productId,
      catalogAvailablePlans: input.availablePlans || ['starter', 'pro', 'enterprise'],
      hasSuccessfulPayment: input.hasSuccessfulPayment ?? false,
      hasOutstandingInvoice: input.hasOutstandingInvoice ?? false,
      customerSegment: input.leadScore >= 50 ? 'existing' : 'new'
    };

    const decision = this.decideCommercialActionUseCase.execute(commercialInput);
    const nextAction = policy.allowedActions.includes(decision.nextAction)
      ? decision.nextAction
      : 'collect_requirements';

    return {
      botName: input.botName,
      channel: input.channel,
      intent,
      recommendedPlan: decision.recommendedPlan,
      nextAction,
      reasonCodes: decision.reasonCodes,
      responseText: this.buildResponseText(input, decision.recommendedPlan, nextAction, decision.reasonCodes)
    };
  }

  private buildResponseText(
    input: BotInput,
    recommendedPlan: string,
    nextAction: string,
    reasonCodes: string[]
  ): string {
    const reasonSummary = reasonCodes.slice(0, 3).join(', ');

    return [
      `Customer ${input.customerId}, we recommend plan ${recommendedPlan}.`,
      `Next action: ${nextAction}.`,
      `Policy signals: ${reasonSummary}.`
    ].join(' ');
  }
}
