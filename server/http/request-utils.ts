import { IncomingMessage } from 'node:http';

const MAX_BODY_SIZE = 1024 * 1024;

export async function readRequestBody(req: IncomingMessage): Promise<{ body: unknown; rawBody: string }> {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > MAX_BODY_SIZE) {
        reject(new Error('Payload too large'));
      }
    });

    req.on('end', () => {
      if (!raw) {
        resolve({ body: {}, rawBody: '' });
        return;
      }

      try {
        resolve({ body: JSON.parse(raw), rawBody: raw });
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

export function getHeader(req: IncomingMessage, headerName: string): string | undefined {
  const value = req.headers[headerName.toLowerCase()];
  return typeof value === 'string' ? value : undefined;
}
