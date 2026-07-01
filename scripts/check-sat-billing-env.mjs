#!/usr/bin/env node

const REQUIRED_COMMON = [
  'INVOICE_PROVIDER',
  'RESEND_API_KEY',
  'BILLING_FROM_EMAIL'
];

const PROVIDER_REQUIRED = {
  facturama: ['FACTURAMA_API_KEY', 'FACTURAMA_API_SECRET'],
  timbox: ['TIMBOX_ADAPTER_URL', 'TIMBOX_USERNAME', 'TIMBOX_PASSWORD']
};

const OPTIONAL = [
  'BILLING_SELLER_EMAIL',
  'BILLING_ACCOUNTANT_EMAIL',
  'FACTURAMA_API_BASE_URL',
  'FACTURAMA_ISSUE_CFDI_URL',
  'TIMBOX_TIMBRADO_WSDL',
  'TIMBOX_SXML_BASE64',
  'TIMBOX_SXML_PATH',
  'TIMBOX_TIMEOUT_MS',
  'TIMBOX_TIMBRADO_PREFLIGHT_STRICT',
  'TIMBOX_CANCELACION_WSDL',
  'TIMBOX_ADAPTER_CANCEL_URL',
  'TIMBOX_CANCELACION_RFC_EMISOR',
  'TIMBOX_CANCELACION_UUID',
  'TIMBOX_CANCELACION_MOTIVO',
  'TIMBOX_CANCELACION_FOLIO_SUSTITUCION',
  'TIMBOX_CANCELACION_FOLIOS_JSON',
  'TIMBOX_CANCELACION_CERT_PATH',
  'TIMBOX_CANCELACION_LLAVE_PATH',
  'TIMBOX_ADAPTER_MANIFIESTO_URL',
  'TIMBOX_MANIFIESTO_METHOD',
  'TIMBOX_MANIFIESTO_WSDL',
  'TIMBOX_MANIFIESTO_EMAIL',
  'TIMBOX_MANIFIESTO_RFC',
  'TIMBOX_MANIFIESTO_RAZON_SOCIAL',
  'TIMBOX_MANIFIESTO_LLAVE_PATH',
  'TIMBOX_MANIFIESTO_CADENA',
  'TIMBOX_MANIFIESTO_SELLO',
  'TIMBOX_MANIFIESTO_CERTIFICADO_PATH',
  'TIMBOX_MANIFIESTO_REQUIRED',
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
  const provider = (process.env.INVOICE_PROVIDER || '').trim().toLowerCase();
  const providerRequired = PROVIDER_REQUIRED[provider] || [];
  const required = [...REQUIRED_COMMON, ...providerRequired];

  console.log('SAT/Billing environment check');
  console.log('-----------------------------');
  console.log(`Provider: ${provider || 'undefined'}`);

  for (const key of required) {
    const value = process.env[key];
    const ok = !isMissing(value);
    console.log(`${ok ? 'OK ' : 'MISS'} ${key}${ok ? ` = ${mask(value)}` : ''}`);
    if (!ok) missing.push(key);
  }

  if (provider === 'timbox') {
    const hasInlineXml = !isMissing(process.env.TIMBOX_SXML_BASE64);
    const hasXmlPath = !isMissing(process.env.TIMBOX_SXML_PATH);
    const ok = hasInlineXml || hasXmlPath;
    console.log(`${ok ? 'OK ' : 'MISS'} TIMBOX_SXML_BASE64|TIMBOX_SXML_PATH`);
    if (!ok) {
      missing.push('TIMBOX_SXML_BASE64|TIMBOX_SXML_PATH');
    }

    const manifiestoRequired = (process.env.TIMBOX_MANIFIESTO_REQUIRED || '').trim().toLowerCase() === 'true';
    if (manifiestoRequired) {
      const method = (process.env.TIMBOX_MANIFIESTO_METHOD || 'firmar_manifiesto').trim();
      const manifestRequired = method === 'firmar_manifiesto_sello'
        ? ['TIMBOX_MANIFIESTO_EMAIL', 'TIMBOX_MANIFIESTO_CADENA', 'TIMBOX_MANIFIESTO_SELLO']
        : ['TIMBOX_MANIFIESTO_EMAIL', 'TIMBOX_MANIFIESTO_RFC', 'TIMBOX_MANIFIESTO_RAZON_SOCIAL'];

      for (const key of manifestRequired) {
        const value = process.env[key];
        const okManifest = !isMissing(value);
        console.log(`${okManifest ? 'OK ' : 'MISS'} ${key}${okManifest ? ` = ${mask(value)}` : ''}`);
        if (!okManifest) missing.push(key);
      }

      const hasManifestCertInline = !isMissing(process.env.TIMBOX_MANIFIESTO_CERTIFICADO_PEM);
      const hasManifestCertPath = !isMissing(process.env.TIMBOX_MANIFIESTO_CERTIFICADO_PATH);
      const hasManifestKeyInline = !isMissing(process.env.TIMBOX_MANIFIESTO_LLAVE_PEM);
      const hasManifestKeyPath = !isMissing(process.env.TIMBOX_MANIFIESTO_LLAVE_PATH);
      const hasManifestAdapterUrl = !isMissing(process.env.TIMBOX_ADAPTER_MANIFIESTO_URL) || !isMissing(process.env.TIMBOX_ADAPTER_URL);

      console.log(`${hasManifestCertInline || hasManifestCertPath ? 'OK ' : 'MISS'} TIMBOX_MANIFIESTO_CERTIFICADO_PEM|TIMBOX_MANIFIESTO_CERTIFICADO_PATH`);
      if (method !== 'firmar_manifiesto_sello') {
        console.log(`${hasManifestKeyInline || hasManifestKeyPath ? 'OK ' : 'MISS'} TIMBOX_MANIFIESTO_LLAVE_PEM|TIMBOX_MANIFIESTO_LLAVE_PATH`);
      }
      console.log(`${hasManifestAdapterUrl ? 'OK ' : 'MISS'} TIMBOX_ADAPTER_MANIFIESTO_URL|TIMBOX_ADAPTER_URL`);

      if (!hasManifestCertInline && !hasManifestCertPath) {
        missing.push('TIMBOX_MANIFIESTO_CERTIFICADO_PEM|TIMBOX_MANIFIESTO_CERTIFICADO_PATH');
      }
      if (method !== 'firmar_manifiesto_sello' && !hasManifestKeyInline && !hasManifestKeyPath) {
        missing.push('TIMBOX_MANIFIESTO_LLAVE_PEM|TIMBOX_MANIFIESTO_LLAVE_PATH');
      }
      if (!hasManifestAdapterUrl) {
        missing.push('TIMBOX_ADAPTER_MANIFIESTO_URL|TIMBOX_ADAPTER_URL');
      }
    }
  }

  for (const key of OPTIONAL) {
    const value = process.env[key];
    const ok = !isMissing(value);
    console.log(`${ok ? 'OPT' : '---'} ${key}${ok ? ` = ${mask(value)}` : ''}`);
  }

  if (provider && !Object.keys(PROVIDER_REQUIRED).includes(provider)) {
    console.log(`WARN INVOICE_PROVIDER=${provider}. Expected one of: ${Object.keys(PROVIDER_REQUIRED).join(', ')}`);
  }

  if (missing.length > 0) {
    console.error('\nMissing SAT/billing vars:');
    for (const key of missing) console.error(`- ${key}`);
    process.exit(1);
  }

  console.log('\nSAT/Billing env is ready.');
}

main();
