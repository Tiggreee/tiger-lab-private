import { HttpError } from '../../errors';
import { BotQueryRequest } from '../requests/bot-query-request';

export function validateBotQueryRequest(payload: unknown): BotQueryRequest {
  const candidate = (payload ?? {}) as BotQueryRequest;

  if (candidate.message && typeof candidate.message !== 'string') {
    throw new HttpError(400, 'message must be a string.');
  }

  if (candidate.score !== undefined && typeof candidate.score !== 'number') {
    throw new HttpError(400, 'score must be a number.');
  }

  return candidate;
}
