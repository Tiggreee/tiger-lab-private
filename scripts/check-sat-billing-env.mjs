#!/usr/bin/env node

const REQUIRED = [
  'INVOICE_PROVIDER',
  'FACTURAMA_API_KEY',
  'FACTURAMA_API_SECRET',
  'RESEND_API_KEY',
  'BILLING_FROM_EMAIL'
];

const OPTIONAL = [
  'BILLING_SELLER_EMAIL',
  'BILLING_ACCOUNTANT_EMAIL',
  'FACTURAMA_API_BASE_URL',
  'FACTURAMA_ISSUE_CFDI_URL',
  'INVOICE_AUTOMATION_STRICT'
];

const PLACEHOLDER_PATTERNS = [/^CHANGE_ME$/i, /^REPLACE_ME$/i, /^YOUR_.+/i, /^EXAMPLE/i];

function isMissing(value) {
  if (typeof value !== 'string') return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function mask(value) {
  if (typeof value !== 'string' || value.length <= 6) return '***';
  return `${value.slice(0, 3)}***${value.slice(-2)}`;
}

function main() {
  const missing = [];

  console.log('SAT/Billing environment check');
  console.log('-----------------------------');

  for (const key of REQUIRED) {
    const value = process.env[key];
    const ok = !isMissing(value);
    console.log(`${ok ? 'OK ' : 'MISS'} ${key}${ok ? ` = ${mask(value)}` : ''}`);
    if (!ok) missing.push(key);
  }

  for (const key of OPTIONAL) {
    const value = process.env[key];
    const ok = !isMissing(value);
    console.log(`${ok ? 'OPT' : '---'} ${key}${ok ? ` = ${mask(value)}` : ''}`);
  }

  const provider = (process.env.INVOICE_PROVIDER || '').trim().toLowerCase();
  if (provider && provider !== 'facturama') {
    console.log(`WARN INVOICE_PROVIDER=${provider}. Expected: facturama`);
  }

  if (missing.length > 0) {
    console.error('\nMissing SAT/billing vars:');
    for (const key of missing) console.error(`- ${key}`);
    process.exit(1);
  }

  console.log('\nSAT/Billing env is ready.');
}

main();
