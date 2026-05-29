import { HttpError } from '../../errors';
import { GenerateProductRequest } from '../requests/generate-product-request';

export function validateGenerateProductRequest(payload: unknown): GenerateProductRequest {
  const candidate = (payload ?? {}) as GenerateProductRequest;

  if (candidate.repo && typeof candidate.repo !== 'string') {
    throw new HttpError(400, 'repo must be a string.');
  }

  if (candidate.type && typeof candidate.type !== 'string') {
    throw new HttpError(400, 'type must be a string.');
  }

  return candidate;
}
