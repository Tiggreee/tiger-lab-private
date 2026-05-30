import { HttpError } from '../../errors';
import { PublishContentRequest } from '../requests/publish-content-request';

export function validatePublishContentRequest(payload: unknown): PublishContentRequest {
  const candidate = (payload ?? {}) as PublishContentRequest;

  if (candidate.publicationId !== undefined && typeof candidate.publicationId !== 'string') {
    throw new HttpError(400, 'publicationId must be a string.');
  }

  if (candidate.assetId !== undefined && typeof candidate.assetId !== 'string') {
    throw new HttpError(400, 'assetId must be a string.');
  }

  if (candidate.channel !== undefined && typeof candidate.channel !== 'string') {
    throw new HttpError(400, 'channel must be a string.');
  }

  return candidate;
}
