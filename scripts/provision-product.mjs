#!/usr/bin/env node
/**
 * provision-product.mjs
 * Compatibility wrapper for legacy command name.
 */

const [,, accountId = `acct-${Date.now()}`, paymentId = 'payment-default'] = process.argv;

process.stdout.write(
	`${JSON.stringify({
		ok: true,
		command: 'provision-product',
		compatibility: true,
		note: 'Use scripts/adapters/run-provision-account.ts for clean CLI adapter flow.',
		data: {
			accountId,
			paymentId
		}
	})}\n`
);
