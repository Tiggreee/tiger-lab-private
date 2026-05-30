import { AgentOutput, validateAgentOutput } from '../contracts/agent-output.schema';
import { FORBIDDEN_TERMS } from '../../shared/forbidden-terms';

export function assertValidAgentOutput(output: unknown): AgentOutput {
  if (!validateAgentOutput(output)) {
    throw new Error('Invalid agent output payload.');
  }

  if (output.result.trim().length === 0) {
    throw new Error('Agent output result cannot be empty.');
  }

  const normalized = output.result.toLowerCase();
  const forbidden = FORBIDDEN_TERMS.find((term) => normalized.includes(term));
  if (forbidden) {
    throw new Error(`Agent output contains forbidden term: ${forbidden}.`);
  }

  return output;
}
