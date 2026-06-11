import { HttpError } from '../../errors';
import { CreateCheckoutSessionRequest } from '../requests/create-checkout-session-request';

export function validateCreateCheckoutSessionRequest(payload: unknown): CreateCheckoutSessionRequest {
  const candidate = (payload ?? {}) as CreateCheckoutSessionRequest;

  if (candidate.productId !== undefined && typeof candidate.productId !== 'string') {
    throw new HttpError(400, 'productId must be a string.');
  }

  if (candidate.planId !== undefined && typeof candidate.planId !== 'string') {
    throw new HttpError(400, 'planId must be a string.');
  }

  if (candidate.amount !== undefined && (!Number.isFinite(candidate.amount) || candidate.amount < 0)) {
    throw new HttpError(400, 'amount must be a non-negative number.');
  }

  if (candidate.currency !== undefined && typeof candidate.currency !== 'string') {
    throw new HttpError(400, 'currency must be a string.');
  }

  if (candidate.returnUrl !== undefined && typeof candidate.returnUrl !== 'string') {
    throw new HttpError(400, 'returnUrl must be a string.');
  }

  if (candidate.cancelUrl !== undefined && typeof candidate.cancelUrl !== 'string') {
    throw new HttpError(400, 'cancelUrl must be a string.');
  }

  return candidate;
}
