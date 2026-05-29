import SqlDataSink from './DATA_SINK';

interface EventBusEvent {
  type: string;
  payload: unknown;
}

interface SubscribableEventBus {
  subscribe: (
    eventType: string,
    handler: (event: EventBusEvent) => Promise<void> | void
  ) => void;
}

export function attachPersistence(eventBus: SubscribableEventBus, dataSink: SqlDataSink): void {
  eventBus.subscribe('*', async (event) => {
    try {
      await dataSink.saveEvent(event);
    } catch (err) {
      // Keep runtime resilient even when persistence fails.
      console.error('Error saving event:', err);
    }
  });
}
