import { HttpError } from '../../errors';
import { CatalogQueryAction, CatalogQueryRequest } from '../requests/catalog-query-request';

const ALLOWED_ACTIONS: CatalogQueryAction[] = [
  'get-product',
  'get-plan',
  'resolve-offer',
  'is-available-for-channel'
];

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, `${fieldName} must be a non-empty string.`);
  }

  return value;
}

export function validateCatalogQueryRequest(payload: unknown): CatalogQueryRequest {
  const candidate = (payload ?? {}) as CatalogQueryRequest;
  const action = assertString(candidate.action, 'action') as CatalogQueryAction;

  if (!ALLOWED_ACTIONS.includes(action)) {
    throw new HttpError(400, `action must be one of: ${ALLOWED_ACTIONS.join(', ')}`);
  }

  if (action === 'get-product' || action === 'resolve-offer' || action === 'is-available-for-channel') {
    assertString(candidate.productId, 'productId');
  }

  if (action === 'get-plan' || action === 'resolve-offer' || action === 'is-available-for-channel') {
    assertString(candidate.planId, 'planId');
  }

  if (action === 'is-available-for-channel') {
    assertString(candidate.channel, 'channel');
  }

  if (candidate.at !== undefined && typeof candidate.at !== 'string') {
    throw new HttpError(400, 'at must be a valid ISO date string when provided.');
  }

  return candidate;
}
