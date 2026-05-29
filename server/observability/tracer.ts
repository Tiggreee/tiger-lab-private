export interface TraceSpan {
  readonly traceId: string;
  readonly startedAt: number;
}

export interface Tracer {
  startSpan(traceId: string): TraceSpan;
  endSpan(span: TraceSpan): number;
}

class InMemoryTracer implements Tracer {
  public startSpan(traceId: string): TraceSpan {
    return {
      traceId,
      startedAt: Date.now()
    };
  }

  public endSpan(span: TraceSpan): number {
    return Date.now() - span.startedAt;
  }
}

export const tracer: Tracer = new InMemoryTracer();
