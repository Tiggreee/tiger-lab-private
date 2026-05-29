import { ChannelPolicy } from '../contracts/channel-policy.schema';
import { BotOutput, validateBotOutput } from '../contracts/bot-output.schema';

const FORBIDDEN_TERMS = ['password', 'secret', 'token'];

export function assertValidBotOutput(output: unknown, policy: ChannelPolicy): BotOutput {
  if (!validateBotOutput(output)) {
    throw new Error('Invalid bot output payload.');
  }

  if (!policy.allowedActions.includes(output.nextAction)) {
    throw new Error(`Output action is not allowed for channel ${policy.channel}.`);
  }

  if (output.responseText.length > policy.maxResponseLength) {
    throw new Error(`Output exceeds max length for channel ${policy.channel}.`);
  }

  const normalized = output.responseText.toLowerCase();
  const foundForbiddenTerm = FORBIDDEN_TERMS.find((term) => normalized.includes(term));
  if (foundForbiddenTerm) {
    throw new Error(`Output contains forbidden term: ${foundForbiddenTerm}.`);
  }

  return output;
}
