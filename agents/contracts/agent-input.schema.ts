export interface AgentInput {
  readonly agentName: string;
  readonly task: string;
  readonly variables: Record<string, string>;
  readonly requestedVersion?: string;
  readonly requestedPromptVersion?: string;
}

export function validateAgentInput(input: unknown): input is AgentInput {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as Record<string, unknown>;
  return (
    typeof candidate.agentName === 'string' &&
    typeof candidate.task === 'string' &&
    typeof candidate.variables === 'object' &&
    candidate.variables !== null
  );
}

export function assertAgentInput(input: unknown): AgentInput {
  if (!validateAgentInput(input)) {
    throw new Error('Invalid agent input payload.');
  }

  return input;
}
