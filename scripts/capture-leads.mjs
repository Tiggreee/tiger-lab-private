#!/usr/bin/env node
/**
 * capture-leads.mjs
 * Backward-compatible alias for capture-lead command.
 */

const [,, source = 'unknown'] = process.argv;

process.stdout.write(
	`${JSON.stringify({
		ok: true,
		command: 'capture-leads',
		aliasFor: 'capture-lead',
		compatibility: true,
		note: 'Use scripts/adapters/run-capture-lead.ts for clean CLI adapter flow.',
		data: {
			source
		}
	})}\n`
);
