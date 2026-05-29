#!/usr/bin/env node
/**
 * capture-lead.mjs
 * Compatibility wrapper for legacy command name.
 */

const [,, source = 'unknown'] = process.argv;

process.stdout.write(
  `${JSON.stringify({
    ok: true,
    command: 'capture-lead',
    compatibility: true,
    note: 'Use scripts/adapters/run-capture-lead.ts for clean CLI adapter flow.',
    data: {
      source
    }
  })}\n`
);
