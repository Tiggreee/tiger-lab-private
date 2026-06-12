#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [, , productId = 'facturautentico-cloud', planId = 'starter'] = process.argv;

function normalize(value) {
	return String(value || '').trim().toLowerCase();
}

function leadMatchesProduct(lead, targetProductId) {
	const normalizedTarget = normalize(targetProductId);
	if (!normalizedTarget) {
		return false;
	}

	const directProduct = normalize(lead?.productId);
	if (directProduct && directProduct === normalizedTarget) {
		return true;
	}

	const attributeProduct = normalize(lead?.attributes?.product);
	if (attributeProduct && attributeProduct === normalizedTarget) {
		return true;
	}

	const source = normalize(lead?.source);
	return source.includes(normalizedTarget);
}

function readJson(filePath, fallback) {
	if (!fs.existsSync(filePath)) {
		return fallback;
	}

	try {
		return JSON.parse(fs.readFileSync(filePath, 'utf8'));
	} catch {
		return fallback;
	}
}

const runtimePath = path.resolve('ops/runtime/runtime-state.json');
const runtimeState = readJson(runtimePath, {
	leads: {},
	leadScores: {},
	payments: {},
	accounts: {},
	assets: {},
	publications: {}
});

const payments = Object.values(runtimeState.payments || {}).filter((payment) => payment.productId === productId);
const accounts = Object.values(runtimeState.accounts || {}).filter((account) => account.productId === productId);
const assets = Object.values(runtimeState.assets || {}).filter((asset) => asset.productId === productId);
const leads = Object.values(runtimeState.leads || {});
const productLeads = leads.filter((lead) => leadMatchesProduct(lead, productId));

const revenue = payments
	.filter((payment) => payment.status === 'succeeded')
	.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

const avgTicket = payments.length > 0 ? Number((revenue / payments.length).toFixed(2)) : 0;

process.stdout.write(
	`${JSON.stringify({
		ok: true,
		command: 'analyze-monetization',
		data: {
			productId,
			planId,
			totals: {
				leads: Object.keys(runtimeState.leads || {}).length,
				productLeads: productLeads.length,
				payments: payments.length,
				accounts: accounts.length,
				contentAssets: assets.length
			},
			revenue: {
				currency: 'USD',
				total: revenue,
				averageTicket: avgTicket
			},
			generatedAt: new Date().toISOString()
		}
	})}\n`
);
