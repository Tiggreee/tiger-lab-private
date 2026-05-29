import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function collectJsonFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = resolve(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...collectJsonFiles(fullPath));
    } else if (entry.endsWith('.json')) {
      results.push(fullPath);
    }
  }

  return results;
}

describe('Event and catalog contract tests', () => {
  it('validates event envelope required fields contract', () => {
    const envelopePath = resolve(process.cwd(), 'ops/events/schemas/envelope/event-envelope.v1.json');
    const envelope = JSON.parse(readFileSync(envelopePath, 'utf-8')) as { required: string[] };

    expect(envelope.required).toEqual([
      'eventId',
      'eventType',
      'eventVersion',
      'occurredAt',
      'correlationId',
      'causationId',
      'producer',
      'payload'
    ]);
  });

  it('loads and validates all event payload schemas as JSON schema objects', () => {
    const schemasRoot = resolve(process.cwd(), 'ops/events/schemas');
    const files = collectJsonFiles(schemasRoot);

    expect(files.length).toBeGreaterThan(0);

    for (const filePath of files) {
      const json = JSON.parse(readFileSync(filePath, 'utf-8')) as {
        type?: string;
        properties?: Record<string, unknown>;
      };

      expect(json.type).toBe('object');
      expect(typeof json.properties).toBe('object');
    }
  });

  it('validates catalog manifest points to existing files', () => {
    const manifestPath = resolve(process.cwd(), 'ops/catalog/catalog-manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
      files: Record<string, string>;
    };

    for (const fileName of Object.values(manifest.files)) {
      const filePath = resolve(process.cwd(), 'ops/catalog', fileName);
      const raw = readFileSync(filePath, 'utf-8');
      expect(() => JSON.parse(raw)).not.toThrow();
    }
  });
});
