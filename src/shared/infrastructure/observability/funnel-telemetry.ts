import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { appendFunnelEventToPostgres } from '../persistence/postgres-runtime-store';

export type FunnelEventType =
  | 'lead_captured'
  | 'lead_scored'
  | 'bot_query'
  | 'conversation_entry'
  | 'payment_succeeded'
  | 'account_provisioned'
  | 'content_generated'
  | 'content_published';

export interface FunnelEvent {
  readonly type: FunnelEventType;
  readonly occurredAt: string;
  readonly payload: Record<string, unknown>;
}

function eventsFilePath(): string {
  return path.resolve(process.env.FUNNEL_EVENTS_FILE || 'ops/runtime/funnel-events.jsonl');
}

export async function trackFunnelEvent(type: FunnelEventType, payload: Record<string, unknown>): Promise<void> {
  const filePath = eventsFilePath();
  const dirPath = path.dirname(filePath);
  await mkdir(dirPath, { recursive: true });

  const event: FunnelEvent = {
    type,
    occurredAt: new Date().toISOString(),
    payload
  };

  const backend = (process.env.FUNNEL_EVENTS_BACKEND || '').trim().toLowerCase();
  const shouldWritePostgres =
    backend === 'postgres' ||
    (backend !== 'file' && typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.trim().length > 0);

  if (shouldWritePostgres) {
    try {
      await appendFunnelEventToPostgres(event);
    } catch {
      // Keep file append as fallback durability path.
    }
  }

  await appendFile(filePath, `${JSON.stringify(event)}\n`, 'utf8');
}
