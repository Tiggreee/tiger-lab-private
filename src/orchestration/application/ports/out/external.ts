/** Orchestration external service output ports. */
export interface CommandQueuePort {
  enqueueCommand(): Promise<void>;
}

export interface EventQueuePort {
  enqueueEvent(): Promise<void>;
}

export interface SchedulerPort {
  schedule(): Promise<void>;
}

export interface WorkflowEnginePort {
  runWorkflow(): Promise<void>;
}
