import { HttpError } from '../../errors';
import { ConversationEntryRequest } from '../requests/conversation-entry-request';

export function validateConversationEntryRequest(payload: unknown): ConversationEntryRequest {
  const candidate = (payload ?? {}) as ConversationEntryRequest;
  const channel = candidate.channel || 'whatsapp';
  const destination = (candidate.destination || '').trim();

  if (candidate.leadId !== undefined && typeof candidate.leadId !== 'string') {
    throw new HttpError(400, 'leadId must be a string.');
  }

  if (candidate.campaign !== undefined && typeof candidate.campaign !== 'string') {
    throw new HttpError(400, 'campaign must be a string.');
  }

  if (candidate.channel !== undefined && !['whatsapp', 'dm', 'calendar', 'landing'].includes(candidate.channel)) {
    throw new HttpError(400, 'channel must be one of: whatsapp, dm, calendar, landing.');
  }

  if (candidate.destination !== undefined && typeof candidate.destination !== 'string') {
    throw new HttpError(400, 'destination must be a string.');
  }

  if ((channel === 'whatsapp' || channel === 'calendar' || channel === 'landing') && !destination) {
    throw new HttpError(400, `destination is required when channel is ${channel}.`);
  }

  if (channel === 'whatsapp') {
    const phone = destination.replace(/[^\d]/g, '');
    if (!/^\d{10,15}$/.test(phone)) {
      throw new HttpError(400, 'destination must be a valid whatsapp number (10-15 digits).');
    }
  }

  if (candidate.message !== undefined && typeof candidate.message !== 'string') {
    throw new HttpError(400, 'message must be a string.');
  }

  return candidate;
}
