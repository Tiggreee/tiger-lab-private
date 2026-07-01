#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function requireEnv(name) {
  const value = (process.env[name] || '').trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optionalEnv(name, fallback = '') {
  const value = (process.env[name] || '').trim();
  return value || fallback;
}

function resolveKeyPem() {
  const inline = optionalEnv('TIMBOX_MANIFIESTO_LLAVE_PEM');
  if (inline) return inline;

  const keyPath = optionalEnv('TIMBOX_MANIFIESTO_LLAVE_PATH');
  if (!keyPath) {
    throw new Error('Missing TIMBOX_MANIFIESTO_LLAVE_PEM or TIMBOX_MANIFIESTO_LLAVE_PATH.');
  }

  const resolved = path.resolve(keyPath);
  const content = fs.readFileSync(resolved, 'utf8').trim();
  if (!content) {
    throw new Error(`Private key file is empty: ${resolved}`);
  }
  return content;
}

function resolveCertPem() {
  const inline = optionalEnv('TIMBOX_MANIFIESTO_CERTIFICADO_PEM');
  if (inline) return inline;

  const certPath = optionalEnv('TIMBOX_MANIFIESTO_CERTIFICADO_PATH');
  if (!certPath) {
    throw new Error('Missing TIMBOX_MANIFIESTO_CERTIFICADO_PEM or TIMBOX_MANIFIESTO_CERTIFICADO_PATH.');
  }

  const resolved = path.resolve(certPath);
  const content = fs.readFileSync(resolved, 'utf8').trim();
  if (!content) {
    throw new Error(`Certificate file is empty: ${resolved}`);
  }
  return content;
}

function resolveCadena() {
  const provided = optionalEnv('TIMBOX_MANIFIESTO_CADENA');
  if (provided) return provided;

  const razon = requireEnv('TIMBOX_MANIFIESTO_RAZON_SOCIAL');
  const rfcEmisor = requireEnv('TIMBOX_MANIFIESTO_RFC_EMISOR');
  const noCert = requireEnv('TIMBOX_MANIFIESTO_NOCERTIFICADO');
  const fecha = optionalEnv('TIMBOX_MANIFIESTO_FECHA', new Date().toISOString().slice(0, 19));
  const rfcPac = optionalEnv('TIMBOX_MANIFIESTO_RFC_PAC', 'IAD121214B34');
  const noAutorizacion = optionalEnv('TIMBOX_MANIFIESTO_NO_AUTORIZACION', '0184');

  return `||${razon}|${rfcEmisor}|${noCert}|${fecha}|${rfcPac}|${noAutorizacion}||`;
}

async function main() {
  const adapterUrlRaw = optionalEnv('TIMBOX_ADAPTER_MANIFIESTO_URL') || optionalEnv('TIMBOX_ADAPTER_URL');
  if (!adapterUrlRaw) {
    throw new Error('Missing TIMBOX_ADAPTER_MANIFIESTO_URL or TIMBOX_ADAPTER_URL.');
  }

  const adapterUrl = adapterUrlRaw.endsWith('/timbox/timbrar')
    ? adapterUrlRaw.replace('/timbox/timbrar', '/timbox/manifiesto/firmar')
    : adapterUrlRaw;

  const username = requireEnv('TIMBOX_USERNAME');
  const password = requireEnv('TIMBOX_PASSWORD');
  const manifiestoMethod = optionalEnv('TIMBOX_MANIFIESTO_METHOD', 'firmar_manifiesto');
  const email = requireEnv('TIMBOX_MANIFIESTO_EMAIL');
  const manifiestoWsdl = optionalEnv('TIMBOX_MANIFIESTO_WSDL', 'https://staging.ws.timbox.com.mx/manifiesto/wsdl');

  const payload = {
    username,
    password,
    email,
    manifiestoWsdl,
    manifiestoMethod
  };

  if (manifiestoMethod === 'firmar_manifiesto_sello') {
    payload.cadena = resolveCadena();
    payload.sello = requireEnv('TIMBOX_MANIFIESTO_SELLO');
    payload.certificado = resolveCertPem();
  } else {
    payload.rfc = requireEnv('TIMBOX_MANIFIESTO_RFC');
    payload.razon_social = requireEnv('TIMBOX_MANIFIESTO_RAZON_SOCIAL');
    payload.cert_pem = resolveCertPem();
    payload.llave_pem = resolveKeyPem();
  }

  const response = await fetch(adapterUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    payload = { raw: responseText };
  }

  if (!response.ok) {
    console.error('Timbox manifiesto signing failed');
    console.error(JSON.stringify(payload, null, 2));
    process.exit(2);
  }

  console.log('Timbox manifiesto signing response:');
  console.log(JSON.stringify(payload, null, 2));

  const code = String(payload?.code || '').trim();
  if (code && code !== '200') {
    process.exit(3);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
