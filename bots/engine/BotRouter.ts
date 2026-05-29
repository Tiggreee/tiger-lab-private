import { BotInput, assertBotInput } from '../contracts/bot-input.schema';
import { BotOutput } from '../contracts/bot-output.schema';
import { getChannelPolicy } from '../contracts/channel-policy.schema';
import { classifyIntent } from './intent-classifier';
import { BotOrchestrator } from './BotOrchestrator';
import { assertValidBotOutput } from './output-validator';

export class BotRouter {
  constructor(private readonly orchestrator: BotOrchestrator = new BotOrchestrator()) {}

  public route(rawInput: unknown): BotOutput {
    const input: BotInput = assertBotInput(rawInput);
    const policy = getChannelPolicy(input.channel);

    // Minimal guardrail pass to guarantee intent exists before orchestration.
    classifyIntent(input.message);

    const output = this.orchestrator.execute(input);
    return assertValidBotOutput(output, policy);
  }
}
