export interface AgentOutput {
  readonly agentName: string;
  readonly agentVersion: string;
  readonly promptVersion: string;
  readonly result: string;
  readonly reasonCodes: string[];
}

export function validateAgentOutput(output: unknown): output is AgentOutput {
  if (!output || typeof output !== 'object') {
    return false;
  }

  const candidate = output as Record<string, unknown>;

  return (
    typeof candidate.agentName === 'string' &&
    typeof candidate.agentVersion === 'string' &&
    typeof candidate.promptVersion === 'string' &&
    typeof candidate.result === 'string' &&
    Array.isArray(candidate.reasonCodes)
  );
}
