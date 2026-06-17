import { IncomingMessage, ServerResponse } from 'node:http';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const EVENT_BUS = resolve('engine/runtime/event-bus.mjs');
const WORKTREE_POOL = resolve('scripts/git/worktree-pool.mjs');
const DURABLE_MEMORY = resolve('engine/runtime/durable-memory.mjs');

function runNode(script: string, args: string): string {
  try {
    return execSync(`node ${script} ${args}`, { encoding: 'utf8', timeout: 30000, cwd: resolve('.') }).trim();
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export class TelemetryController {
  async getStats(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const busStats = JSON.parse(runNode(EVENT_BUS, '--stats'));
    const wtStats = JSON.parse(runNode(WORKTREE_POOL, '--stats'));
    const memStats = JSON.parse(runNode(DURABLE_MEMORY, '--stats'));

    sendJson(res, 200, {
      busEvents: busStats.totalEvents || 0,
      busSubs: busStats.activeSubscribers || 0,
      wtActive: wtStats.activeWorktrees || 0,
      wtTotal: wtStats.totalPoolSize || 0,
      memKeys: memStats.keyCount || 0,
      memOwner: memStats.owner || 'system'
    });
  }
}
