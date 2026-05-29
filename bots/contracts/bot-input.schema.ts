export interface BotInput {
  readonly botName: string;
  readonly channel: 'web' | 'whatsapp' | 'email' | 'internal';
  readonly message: string;
  readonly customerId: string;
  readonly productId: string;
  readonly leadScore: number;
  readonly hasSuccessfulPayment?: boolean;
  readonly hasOutstandingInvoice?: boolean;
  readonly availablePlans?: string[];
}

export function validateBotInput(input: unknown): input is BotInput {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as Record<string, unknown>;

  return (
    typeof candidate.botName === 'string' &&
    typeof candidate.channel === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.customerId === 'string' &&
    typeof candidate.productId === 'string' &&
    typeof candidate.leadScore === 'number'
  );
}

export function assertBotInput(input: unknown): BotInput {
  if (!validateBotInput(input)) {
    throw new Error('Invalid bot input payload.');
  }

  return input;
}
