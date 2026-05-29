import { HttpError } from '../../errors';
import { CatalogQueryResponse } from '../responses/catalog-query-response';

export function validateCatalogQueryResponse(payload: unknown): CatalogQueryResponse {
  const candidate = payload as CatalogQueryResponse;

  if (!candidate || candidate.status !== 'ok' || candidate.action !== 'catalog-query') {
    throw new HttpError(500, 'Invalid catalog query response envelope.');
  }

  if (!candidate.result || typeof candidate.result !== 'object') {
    throw new HttpError(500, 'Invalid catalog query response result.');
  }

  return candidate;
}
