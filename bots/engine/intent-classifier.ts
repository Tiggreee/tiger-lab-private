export type BotIntent = 'commercial' | 'support' | 'faq';

const COMMERCIAL_KEYWORDS = ['buy', 'price', 'plan', 'pay', 'checkout', 'subscribe'];
const SUPPORT_KEYWORDS = ['error', 'issue', 'bug', 'problem', 'fail'];

export function classifyIntent(message: string): BotIntent {
  const normalized = message.toLowerCase();

  if (SUPPORT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'support';
  }

  if (COMMERCIAL_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'commercial';
  }

  return 'faq';
}
