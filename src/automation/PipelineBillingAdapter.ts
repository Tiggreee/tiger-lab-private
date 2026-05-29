export interface PipelineUsageRecord {
  readonly customerId: string;
  readonly pipelineId: string;
  readonly units: number;
}

export class PipelineBillingAdapter {
  private readonly usage: PipelineUsageRecord[] = [];

  public registerUsage(customerId: string, pipelineId: string, units: number): PipelineUsageRecord {
    const record: PipelineUsageRecord = {
      customerId,
      pipelineId,
      units
    };

    this.usage.push(record);
    return record;
  }

  public getUsage(): readonly PipelineUsageRecord[] {
    return this.usage;
  }
}
