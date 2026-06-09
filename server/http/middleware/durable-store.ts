import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const writeQueues = new Map<string, Promise<void>>();

async function ensureFile(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  try {
    await readFile(filePath, 'utf8');
  } catch {
    await writeFile(filePath, '{}\n', 'utf8');
  }
}

export async function readStore<T extends Record<string, unknown>>(filePath: string): Promise<T> {
  await ensureFile(filePath);
  const raw = await readFile(filePath, 'utf8');

  try {
    const parsed = JSON.parse(raw) as T;
    return parsed;
  } catch {
    return {} as T;
  }
}

export async function writeStore<T extends Record<string, unknown>>(filePath: string, data: T): Promise<void> {
  await ensureFile(filePath);

  const queue = writeQueues.get(filePath) || Promise.resolve();
  const next = queue.then(async () => {
    await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  });

  writeQueues.set(filePath, next.catch(() => undefined));
  await next;
}
