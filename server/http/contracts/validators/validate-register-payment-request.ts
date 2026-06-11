import { HttpError } from '../../errors';
import { RegisterPaymentRequest } from '../requests/register-payment-request';

export function validateRegisterPaymentRequest(payload: unknown): RegisterPaymentRequest {
  const candidate = (payload ?? {}) as RegisterPaymentRequest;

  if (candidate.paymentId !== undefined && typeof candidate.paymentId !== 'string') {
    throw new HttpError(400, 'paymentId must be a string.');
  }

  if (candidate.customerId !== undefined && typeof candidate.customerId !== 'string') {
    throw new HttpError(400, 'customerId must be a string.');
  }

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

  if (candidate.buyerEmail !== undefined && typeof candidate.buyerEmail !== 'string') {
    throw new HttpError(400, 'buyerEmail must be a string.');
  }

  if (candidate.sellerEmail !== undefined && typeof candidate.sellerEmail !== 'string') {
    throw new HttpError(400, 'sellerEmail must be a string.');
  }

  if (candidate.accountantEmail !== undefined && typeof candidate.accountantEmail !== 'string') {
    throw new HttpError(400, 'accountantEmail must be a string.');
  }

  return candidate;
}
