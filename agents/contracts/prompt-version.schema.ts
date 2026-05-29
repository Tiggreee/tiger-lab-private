export interface PromptVersion {
  readonly agentName: string;
  readonly promptVersion: string;
  readonly filePath: string;
}

export function validatePromptVersion(payload: unknown): payload is PromptVersion {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as Record<string, unknown>;

  return (
    typeof candidate.agentName === 'string' &&
    typeof candidate.promptVersion === 'string' &&
    typeof candidate.filePath === 'string'
  );
}
