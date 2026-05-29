import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface AgentVersionRecord {
  readonly agentName: string;
  readonly activeAgentVersion: string;
  readonly activePromptVersion: string;
  readonly rollbackAgentVersion?: string;
  readonly rollbackPromptVersion?: string;
}

interface AgentRegistryFile {
  readonly agents: AgentVersionRecord[];
}

export interface ResolvedAgentVersion {
  readonly agentName: string;
  readonly agentVersion: string;
  readonly promptVersion: string;
  readonly rollbackAgentVersion?: string;
  readonly rollbackPromptVersion?: string;
}

export class AgentRegistry {
  private readonly records: Map<string, AgentVersionRecord>;

  constructor(registryPath?: string) {
    const filePath = registryPath || this.resolveDefaultRegistryPath();
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as AgentRegistryFile;

    this.records = new Map(parsed.agents.map((entry) => [entry.agentName, entry]));
  }

  public resolve(agentName: string, requestedVersion?: string, requestedPromptVersion?: string): ResolvedAgentVersion {
    const record = this.records.get(agentName);
    if (!record) {
      throw new Error(`Agent not registered: ${agentName}`);
    }

    return {
      agentName,
      agentVersion: requestedVersion || record.activeAgentVersion,
      promptVersion: requestedPromptVersion || record.activePromptVersion,
      rollbackAgentVersion: record.rollbackAgentVersion,
      rollbackPromptVersion: record.rollbackPromptVersion
    };
  }

  public rollback(agentName: string): ResolvedAgentVersion {
    const record = this.records.get(agentName);
    if (!record) {
      throw new Error(`Agent not registered: ${agentName}`);
    }

    return {
      agentName,
      agentVersion: record.rollbackAgentVersion || record.activeAgentVersion,
      promptVersion: record.rollbackPromptVersion || record.activePromptVersion,
      rollbackAgentVersion: record.rollbackAgentVersion,
      rollbackPromptVersion: record.rollbackPromptVersion
    };
  }

  private resolveDefaultRegistryPath(): string {
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDir = dirname(currentFilePath);
    return resolve(currentDir, '../versions/agent-registry.json');
  }
}
