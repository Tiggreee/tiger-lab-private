import { EventEnvelope } from './EventEnvelope';

type EventHandler = (event: EventEnvelope<Record<string, unknown>>) => Promise<void> | void;

export class InMemoryEventBus {
  private readonly handlers = new Map<string, EventHandler[]>();
  private readonly stream: EventEnvelope<Record<string, unknown>>[] = [];

  public subscribe(eventType: string, handler: EventHandler): void {
    const current = this.handlers.get(eventType) || [];
    this.handlers.set(eventType, [...current, handler]);
  }

  public async publish(event: EventEnvelope<Record<string, unknown>>): Promise<void> {
    this.stream.push(event);

    const matching = this.handlers.get(event.eventType) || [];
    for (const handler of matching) {
      await handler(event);
    }
  }

  public getStream(): readonly EventEnvelope<Record<string, unknown>>[] {
    return this.stream;
  }
}
