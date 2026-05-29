export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogPayload {
  readonly message: string;
  readonly requestId?: string;
  readonly correlationId?: string;
  readonly endpoint?: string;
  readonly statusCode?: number;
  readonly error?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface Logger {
  log(level: LogLevel, payload: LogPayload): void;
}

class ConsoleStructuredLogger implements Logger {
  public log(level: LogLevel, payload: LogPayload): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      ...payload
    };

    // Structured JSON logging for easy ingestion by external systems.
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  }
}

export const logger: Logger = new ConsoleStructuredLogger();
