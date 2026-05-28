import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const required = [
  '.github/workflows/ci.yml',
  '.github/workflows/security.yml',
  '.github/dependabot.yml',
  'architecture/ADR-0001-repo-foundation.md',
  'docs/internal/LAB_OPERATING_GUIDE.md',
  'templates/node-api/README.md',
  'scripts/new-project.sh',
  'scripts/new-project.ps1'
];

for (const rel of required) {
  const target = path.resolve(rel);
  assert.ok(fs.existsSync(target), `Missing required file: ${rel}`);
}

console.log('Repository foundation smoke test passed.');
