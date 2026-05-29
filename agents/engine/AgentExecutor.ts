import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AgentInput, assertAgentInput } from '../contracts/agent-input.schema';
import { AgentOutput } from '../contracts/agent-output.schema';
import { AgentRegistry } from './AgentRegistry';
import { assertValidAgentOutput } from './output-validator';
import { evaluateSafety } from './safety-rules';

export class AgentExecutor {
  constructor(private readonly registry: AgentRegistry = new AgentRegistry()) {}

  public execute(rawInput: unknown): AgentOutput {
    const input: AgentInput = assertAgentInput(rawInput);
    const safety = evaluateSafety(input.task);

    if (!safety.safe) {
      throw new Error(`Safety rule violation: ${safety.reasonCodes.join(',')}`);
    }

    const resolved = this.registry.resolve(
      input.agentName,
      input.requestedVersion,
      input.requestedPromptVersion
    );

    const promptTemplate = this.loadPromptTemplate(input.agentName, resolved.promptVersion);
    const result = this.renderPrompt(promptTemplate, safety.sanitizedTask, input.variables);

    const output: AgentOutput = {
      agentName: input.agentName,
      agentVersion: resolved.agentVersion,
      promptVersion: resolved.promptVersion,
      result,
      reasonCodes: ['AGENT_EXECUTED', ...safety.reasonCodes]
    };

    return assertValidAgentOutput(output);
  }

  public rollback(rawInput: unknown): AgentOutput {
    const input: AgentInput = assertAgentInput(rawInput);
    const resolved = this.registry.rollback(input.agentName);

    const promptTemplate = this.loadPromptTemplate(input.agentName, resolved.promptVersion);
    const result = this.renderPrompt(promptTemplate, input.task, input.variables);

    const output: AgentOutput = {
      agentName: input.agentName,
      agentVersion: resolved.agentVersion,
      promptVersion: resolved.promptVersion,
      result,
      reasonCodes: ['AGENT_ROLLBACK_EXECUTED']
    };

    return assertValidAgentOutput(output);
  }

  private loadPromptTemplate(agentName: string, promptVersion: string): string {
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDir = dirname(currentFilePath);
    const promptPath = resolve(currentDir, `../prompts/${agentName}/${promptVersion}.md`);

    return readFileSync(promptPath, 'utf-8');
  }

  private renderPrompt(template: string, task: string, variables: Record<string, string>): string {
    let rendered = template.replaceAll('{{task}}', task);

    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replaceAll(`{{${key}}}`, value);
    }

    return rendered.trim();
  }
}
