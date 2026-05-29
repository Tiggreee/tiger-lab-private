#!/usr/bin/env node
/**
 * generate-product.mjs
 * Compatibility wrapper for legacy command name.
 */

const [,, repo, type = 'saas'] = process.argv;
if (!repo) {
  console.error('Uso: generate-product.mjs <repo> [type]');
  process.exit(1);
}

process.stdout.write(
  `${JSON.stringify({
    ok: true,
    command: 'generate-product',
    compatibility: true,
    note: 'Use scripts/adapters/run-create-product.ts for clean CLI adapter flow.',
    data: {
      repo,
      type
    }
  })}\n`
);
