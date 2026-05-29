/** Orchestration repository output ports. */
export interface WorkflowRepositoryPort {
  save(): Promise<void>;
  findById(): Promise<void>;
}
