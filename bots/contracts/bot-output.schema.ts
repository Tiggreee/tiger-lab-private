export interface BotOutput {
  readonly botName: string;
  readonly channel: 'web' | 'whatsapp' | 'email' | 'internal';
  readonly intent: 'commercial' | 'support' | 'faq';
  readonly recommendedPlan: string;
  readonly nextAction: string;
  readonly reasonCodes: string[];
  readonly responseText: string;
}

export function validateBotOutput(output: unknown): output is BotOutput {
  if (!output || typeof output !== 'object') {
    return false;
  }

  const candidate = output as Record<string, unknown>;

  return (
    typeof candidate.botName === 'string' &&
    typeof candidate.channel === 'string' &&
    typeof candidate.intent === 'string' &&
    typeof candidate.recommendedPlan === 'string' &&
    typeof candidate.nextAction === 'string' &&
    Array.isArray(candidate.reasonCodes) &&
    typeof candidate.responseText === 'string'
  );
}
