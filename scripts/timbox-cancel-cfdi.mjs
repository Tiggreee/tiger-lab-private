#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function env(name) {
  return (process.env[name] || '').trim();
}

function requireEnv(name) {
  const value = env(name);
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function readPem(inlineName, pathName) {
  const inline = env(inlineName);
  if (inline) return inline;

  const pemPath = env(pathName);
  if (!pemPath) {
    throw new Error(`Missing ${inlineName} or ${pathName}`);
  }

  const resolved = path.resolve(pemPath);
  const content = fs.readFileSync(resolved, 'utf8').trim();
  if (!content) {
    throw new Error(`Empty PEM file: ${resolved}`);
  }
  return content;
}

function resolveAdapterUrl() {
  const explicit = env('TIMBOX_ADAPTER_CANCEL_URL');
  if (explicit) return explicit;

  const base = env('TIMBOX_ADAPTER_URL');
  if (!base) {
    throw new Error('Missing TIMBOX_ADAPTER_CANCEL_URL or TIMBOX_ADAPTER_URL');
  }

  if (base.endsWith('/timbox/timbrar')) {
    return base.replace(/\/timbox\/timbrar$/, '/timbox/cancelar');
  }

  return `${base.replace(/\/$/, '')}/timbox/cancelar`;
}

function parseFolios() {
  const inlineJson = env('TIMBOX_CANCELACION_FOLIOS_JSON');
  if (inlineJson) {
    const parsed = JSON.parse(inlineJson);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('TIMBOX_CANCELACION_FOLIOS_JSON must be a non-empty JSON array');
    }
    return parsed;
  }

  const uuid = env('TIMBOX_CANCELACION_UUID');
  if (!uuid) {
    throw new Error('Missing TIMBOX_CANCELACION_FOLIOS_JSON or TIMBOX_CANCELACION_UUID');
  }

  const motivo = env('TIMBOX_CANCELACION_MOTIVO') || '02';
  const folioSustitucion = env('TIMBOX_CANCELACION_FOLIO_SUSTITUCION');
  const item = { uuid, motivo };
  if (folioSustitucion) {
    item.folio_sustitucion = folioSustitucion;
  }
  return [item];
}

async function main() {
  const payload = {
    username: requireEnv('TIMBOX_USERNAME'),
    password: requireEnv('TIMBOX_PASSWORD'),
    rfc_emisor: requireEnv('TIMBOX_CANCELACION_RFC_EMISOR'),
    cert_pem: readPem('TIMBOX_CANCELACION_CERT_PEM', 'TIMBOX_CANCELACION_CERT_PATH'),
    llave_pem: readPem('TIMBOX_CANCELACION_LLAVE_PEM', 'TIMBOX_CANCELACION_LLAVE_PATH'),
    folios: parseFolios(),
    cancelacionWsdl: env('TIMBOX_CANCELACION_WSDL') || 'https://staging.ws.timbox.com.mx/cancelacion/wsdl'
  };

  const response = await fetch(resolveAdapterUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    console.error('Timbox cancelar_cfdi failed');
    console.error(JSON.stringify(data, null, 2));
    process.exit(2);
  }

  console.log('Timbox cancelar_cfdi response:');
  console.log(JSON.stringify(data, null, 2));

  const code = String(data?.code || '').trim();
  if (code && code !== '200') {
    process.exit(3);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
