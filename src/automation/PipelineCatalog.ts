export interface PipelineDefinition {
  readonly pipelineId: string;
  readonly requiredPlan: string;
  readonly stages: string[];
}

export class PipelineCatalog {
  private readonly pipelines: PipelineDefinition[] = [
    {
      pipelineId: 'weekly-summary',
      requiredPlan: 'starter',
      stages: ['extract', 'summarize', 'deliver']
    },
    {
      pipelineId: 'billing-reconciliation',
      requiredPlan: 'pro',
      stages: ['collect', 'reconcile', 'report']
    },
    {
      pipelineId: 'multi-channel-campaign',
      requiredPlan: 'enterprise',
      stages: ['segment', 'generate', 'publish', 'measure']
    }
  ];

  public getPipeline(pipelineId: string): PipelineDefinition | null {
    return this.pipelines.find((pipeline) => pipeline.pipelineId === pipelineId) || null;
  }
}
