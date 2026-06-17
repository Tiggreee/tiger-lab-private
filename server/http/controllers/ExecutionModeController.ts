import { IncomingMessage, ServerResponse } from 'node:http';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const MODES_SCRIPT = resolve('engine/runtime/execution-modes.mjs');
const ORCHESTRATOR_SCRIPT = resolve('engine/runtime/orchestrator.mjs');

function runNode(script: string, args: string): string {
  try {
    return execSync(`node ${script} ${args}`, { encoding: 'utf8', timeout: 30000, cwd: resolve('.') }).trim();
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export class ExecutionModeController {
  async getCurrent(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const result = runNode(MODES_SCRIPT, '--list');
    sendJson(res, 200, JSON.parse(result));
  }

  async toggle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req);
    const mode = body.mode as string;
    if (!mode) return sendJson(res, 400, { error: 'mode is required' });
    
    const result = runNode(MODES_SCRIPT, `--set ${mode}`);
    sendJson(res, 200, JSON.parse(result));
  }

  async getGuardrails(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    const result = runNode(MODES_SCRIPT, '--guardrails');
    sendJson(res, 200, JSON.parse(result));
  }

  async resumeTask(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req);
    const taskId = body.taskId as number;
    if (!taskId) return sendJson(res, 400, { error: 'taskId is required' });

    // Since resumeTask is an exported function in orchestrator.mjs, we can't call it via CLI easily 
    // if it's not in the args list. I should add it to the orchestrator's CLI args.
    const result = runNode(ORCHESTRATOR_SCRIPT, `--resume ${taskId}`);
    sendJson(res, 200, JSON.parse(result));
  }
}
