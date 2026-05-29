import { HttpError } from '../../errors';
import { GenerateContentRequest } from '../requests/generate-content-request';

export function validateGenerateContentRequest(payload: unknown): GenerateContentRequest {
  const candidate = (payload ?? {}) as GenerateContentRequest;

  if (candidate.product && typeof candidate.product !== 'string') {
    throw new HttpError(400, 'product must be a string.');
  }

  if (candidate.channel && typeof candidate.channel !== 'string') {
    throw new HttpError(400, 'channel must be a string.');
  }

  return candidate;
}
