export type FlowStatus = 'started' | 'completed' | 'failed';

/** Flow instance entity. */
export class FlowInstance {
  public readonly flowId: string;
  public readonly name: string;
  public readonly startedAt: Date;
  private status: FlowStatus;

  constructor(flowId: string, name: string, startedAt = new Date()) {
    if (!flowId.trim()) {
      throw new Error('Flow ID cannot be empty.');
    }

    if (!name.trim()) {
      throw new Error('Flow name cannot be empty.');
    }

    this.flowId = flowId;
    this.name = name;
    this.startedAt = startedAt;
    this.status = 'started';
  }

  public markCompleted(): void {
    this.status = 'completed';
  }

  public markFailed(): void {
    this.status = 'failed';
  }

  public getStatus(): FlowStatus {
    return this.status;
  }
}
