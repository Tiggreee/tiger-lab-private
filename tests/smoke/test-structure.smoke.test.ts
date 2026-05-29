import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const requiredPaths = [
  'tests/unit/product/product.entity.test.ts',
  'tests/integration/http/http-adapters.integration.test.ts',
  'tests/contract/http/http-contracts.contract.test.ts',
  'tests/contract/events/events-schema.contract.test.ts',
  'tests/e2e/funnel/funnel.e2e.test.ts',
  'tests/e2e/server-mode/server-mode.e2e.test.ts',
  '.github/workflows/test-all.yml',
  '.github/workflows/contract-tests.yml',
  '.github/workflows/schema-validation.yml',
  '.github/workflows/e2e.yml'
];

describe('Smoke checks for test and CI structure', () => {
  it('contains all required phase-7 files', () => {
    for (const relPath of requiredPaths) {
      const absPath = resolve(process.cwd(), relPath);
      expect(existsSync(absPath)).toBe(true);
    }
  });
});
