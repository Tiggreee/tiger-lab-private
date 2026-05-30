import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

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

  await appendFile(filePath, `${JSON.stringify(event)}\n`, 'utf8');
}
