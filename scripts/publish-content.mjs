#!/usr/bin/env node
/**
 * publish-content.mjs
 * Compatibility wrapper for legacy command name.
 */

const [,, file, channel = 'web'] = process.argv;
if (!file) {
  console.error('Uso: publish-content.mjs <file> [channel]');
  process.exit(1);
}

process.stdout.write(
  `${JSON.stringify({
    ok: true,
    command: 'publish-content',
    compatibility: true,
    note: 'Use scripts/adapters/run-publish-content.ts for clean CLI adapter flow.',
    data: {
      file,
      channel
    }
  })}\n`
);
