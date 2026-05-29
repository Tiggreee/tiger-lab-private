import { HttpError } from '../../errors';
import { ProvisionProductRequest } from '../requests/provision-product-request';

export function validateProvisionProductRequest(payload: unknown): ProvisionProductRequest {
  const candidate = (payload ?? {}) as ProvisionProductRequest;

  if (candidate.paymentId && typeof candidate.paymentId !== 'string') {
    throw new HttpError(400, 'paymentId must be a string.');
  }

  if (candidate.userId && typeof candidate.userId !== 'string') {
    throw new HttpError(400, 'userId must be a string.');
  }

  return candidate;
}
