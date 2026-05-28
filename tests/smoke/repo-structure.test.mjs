import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const required = [
  '.github/workflows/ci.yml',
  '.github/workflows/security.yml',
  '.github/dependabot.yml',
  '.github/workflows/daily-monetization-reminder.yml',
  '.github/workflows/weekly-pipeline-reminder.yml',
  'architecture/ADR-0001-repo-foundation.md',
  'docs/internal/LAB_OPERATING_GUIDE.md',
  'docs/internal/COMMAND_CENTER_GUIDE.md',
  'docs/internal/WEEKLY_PIPELINE_BOARD.md',
  'ops/command-center/index.html',
  'ops/command-center/tasks.json',
  'ops/pipeline/weekly-pipeline.json',
  'scripts/command-center-summary.mjs',
  'scripts/pipeline-weekly-summary.mjs',
  'templates/node-api/README.md',
  'scripts/new-project.sh',
  'scripts/new-project.ps1'
];

for (const rel of required) {
  const target = path.resolve(rel);
  assert.ok(fs.existsSync(target), `Missing required file: ${rel}`);
}

console.log('Repository foundation smoke test passed.');
