import { IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const REGISTRY_PATH = resolve('ops/runtime/model-registry.json');

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

export class ModelController {
  async list(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      if (!existsSync(REGISTRY_PATH)) {
        return sendJson(res, 404, { error: 'Registry not found' });
      }
      const data = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
      sendJson(res, 200, data);
    } catch (e) {
      sendJson(res, 500, { error: 'Failed to read registry' });
    }
  }

  async add(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req);
    const { name, type, endpoint, capacity } = body;

    if (!name || !type || !endpoint) {
      return sendJson(res, 400, { error: 'name, type and endpoint are required' });
    }

    try {
      const data = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
      const newModel = {
        id: Date.now().toString(),
        name,
        type,
        endpoint,
        capacity: capacity || 'unknown',
        status: 'active',
        addedAt: new Date().toISOString()
      };
      data.models.push(newModel);
      writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2), 'utf8');
      sendJson(res, 201, newModel);
    } catch (e) {
      sendJson(res, 500, { error: 'Failed to save model' });
    }
  }

  async remove(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', 'http://localhost');
    const id = url.pathname.split('/').pop();
    if (!id) return sendJson(res, 400, { error: 'Model ID is required' });

    try {
      const data = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
      const initialLength = data.models.length;
      data.models = data.models.filter((m: any) => m.id !== id);
      if (data.models.length === initialLength) {
        return sendJson(res, 404, { error: 'Model not found' });
      }
      writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2), 'utf8');
      sendJson(res, 200, { success: true });
    } catch (e) {
      sendJson(res, 500, { error: 'Failed to remove model' });
    }
  }
}
