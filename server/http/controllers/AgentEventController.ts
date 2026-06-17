import { IncomingMessage, ServerResponse } from 'node:http';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const EVENT_BUS = resolve('engine/runtime/event-bus.mjs');
const ORCHESTRATOR = resolve('engine/runtime/orchestrator.mjs');

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

export class AgentEventController {
  async emit(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req);
    const type = body.type as string;
    const payload = JSON.stringify(body.payload || {});
    if (!type) return sendJson(res, 400, { error: 'type is required' });
    const result = runNode(EVENT_BUS, `--emit "${type}" '${payload}'`);
    sendJson(res, 200, JSON.parse(result));
  }

  async subscribe(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req);
    const type = body.type as string;
    const name = body.subscriber as string;
    if (!type || !name) return sendJson(res, 400, { error: 'type and subscriber are required' });
    const result = runNode(EVENT_BUS, `--subscribe "${type}" "${name}"`);
    sendJson(res, 200, JSON.parse(result));
  }

  async getPending(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', 'http://localhost');
    const subscriber = url.pathname.split('/').pop() || '';
    const result = runNode(EVENT_BUS, `--pending "${subscriber}"`);
    sendJson(res, 200, JSON.parse(result));
  }

  async consume(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req);
    const id = body.id as number;
    const name = body.subscriber as string;
    if (!id || !name) return sendJson(res, 400, { error: 'id and subscriber are required' });
    const result = runNode(EVENT_BUS, `--consume ${id} "${name}"`);
    sendJson(res, 200, JSON.parse(result));
  }

  async getHistory(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    const result = runNode(EVENT_BUS, '--history');
    sendJson(res, 200, JSON.parse(result));
  }

  async getStats(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    const result = runNode(EVENT_BUS, '--stats');
    sendJson(res, 200, JSON.parse(result));
  }

  async trigger(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req);
    const description = body.description as string;
    const context = body.context || {};
    if (!description) return sendJson(res, 400, { error: 'description is required' });

    const payload = JSON.stringify({ description, context });
    const result = runNode(ORCHESTRATOR, `--run "${description}"`);
    sendJson(res, 200, JSON.parse(result));
  }
}
