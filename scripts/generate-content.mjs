#!/usr/bin/env node
/**
 * generate-content.mjs
 * Compatibility wrapper for legacy command name.
 */

const [,, product, type = 'post', channel = 'web'] = process.argv;
if (!product) {
  console.error('Uso: generate-content.mjs <product> [type] [channel]');
  process.exit(1);
}

process.stdout.write(
  `${JSON.stringify({
    ok: true,
    command: 'generate-content',
    compatibility: true,
    note: 'Use scripts/adapters/run-generate-content.ts for clean CLI adapter flow.',
    data: {
      product,
      type,
      channel
    }
  })}\n`
);
