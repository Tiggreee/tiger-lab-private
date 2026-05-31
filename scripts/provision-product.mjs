#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [, , accountIdArg, paymentIdArg, productIdArg, planIdArg, customerIdArg] = process.argv;

const accountId = accountIdArg || `acct-${Date.now()}`;
const paymentId = paymentIdArg || `pay-${Date.now()}`;
const productId = productIdArg || 'facturautentico-cloud';
const planId = planIdArg || 'starter';
const customerId = customerIdArg || 'customer-demo';

function ensureDirectory(dirPath) {
	fs.mkdirSync(dirPath, { recursive: true });
}

function readRuntimeState(filePath) {
	if (!fs.existsSync(filePath)) {
		return {
			leads: {},
			leadScores: {},
			payments: {},
			accounts: {},
			assets: {},
			publications: {}
		};
	}

	try {
		return JSON.parse(fs.readFileSync(filePath, 'utf8'));
	} catch {
		return {
			leads: {},
			leadScores: {},
			payments: {},
			accounts: {},
			assets: {},
			publications: {}
		};
	}
}

const now = new Date().toISOString();
const runtimePath = path.resolve('ops/runtime/runtime-state.json');
ensureDirectory(path.dirname(runtimePath));

const runtimeState = readRuntimeState(runtimePath);
runtimeState.payments = runtimeState.payments || {};
runtimeState.accounts = runtimeState.accounts || {};

runtimeState.payments[paymentId] = {
	paymentId,
	customerId,
	productId,
	planId,
	amount: 39,
	currency: 'USD',
	createdAt: now,
	status: 'succeeded'
};

runtimeState.accounts[accountId] = {
	accountId,
	customerId,
	productId,
	planId,
	provisionedAt: now
};

fs.writeFileSync(runtimePath, `${JSON.stringify(runtimeState, null, 2)}\n`, 'utf8');

const eventsPath = path.resolve('ops/runtime/funnel-events.jsonl');
ensureDirectory(path.dirname(eventsPath));
fs.appendFileSync(
	eventsPath,
	`${JSON.stringify({
		type: 'account_provisioned',
		occurredAt: now,
		payload: {
			accountId,
			customerId,
			productId,
			planId
		}
	})}\n`,
	'utf8'
);

process.stdout.write(
	`${JSON.stringify({
		ok: true,
		command: 'provision-product',
		data: {
			accountId,
			paymentId,
			customerId,
			productId,
			planId,
			provisionedAt: now
		}
	})}\n`
);
