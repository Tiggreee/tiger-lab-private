#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const markdownMode = args.includes('--markdown');
const strictMode = args.includes('--strict');

const reportJsonPath = path.resolve('ops/runtime/timbox-manifest-e2e-report.json');
const reportMdPath = path.resolve('ops/runtime/timbox-manifest-e2e-report.md');

function env(name) {
  return (process.env[name] || '').trim();
}

function mask(value) {
  if (!value) return 'missing';
  if (value.length <= 6) return '***';
  return `${value.slice(0, 3)}***${value.slice(-2)}`;
}

function resolveAdapterUrl() {
  const manifestUrl = env('TIMBOX_ADAPTER_MANIFIESTO_URL');
  if (manifestUrl) return manifestUrl;

  const adapterUrl = env('TIMBOX_ADAPTER_URL');
  if (!adapterUrl) return '';
  if (adapterUrl.endsWith('/timbox/timbrar')) {
    return adapterUrl.replace(/\/timbox\/timbrar$/, '/timbox/manifiesto/firmar');
  }
  return `${adapterUrl.replace(/\/$/, '')}/timbox/manifiesto/firmar`;
}

function readPemFromEnvOrPath(inlineEnv, pathEnv) {
  const inline = env(inlineEnv);
  if (inline) return inline;

  const pemPath = env(pathEnv);
  if (!pemPath) return '';

  try {
    return fs.readFileSync(path.resolve(pemPath), 'utf8').trim();
  } catch {
    return '';
  }
}

function requiredByMethod(method) {
  if (method === 'firmar_manifiesto_sello') {
    return ['TIMBOX_MANIFIESTO_EMAIL', 'TIMBOX_MANIFIESTO_CADENA', 'TIMBOX_MANIFIESTO_SELLO'];
  }
  return ['TIMBOX_MANIFIESTO_EMAIL', 'TIMBOX_MANIFIESTO_RFC', 'TIMBOX_MANIFIESTO_RAZON_SOCIAL'];
}

function buildPayload(method) {
  const username = env('TIMBOX_USERNAME');
  const password = env('TIMBOX_PASSWORD');
  const email = env('TIMBOX_MANIFIESTO_EMAIL');
  const manifiestoWsdl = env('TIMBOX_MANIFIESTO_WSDL') || 'https://staging.ws.timbox.com.mx/manifiesto/wsdl';

  const certificado = readPemFromEnvOrPath('TIMBOX_MANIFIESTO_CERTIFICADO_PEM', 'TIMBOX_MANIFIESTO_CERTIFICADO_PATH');
  const llavePem = readPemFromEnvOrPath('TIMBOX_MANIFIESTO_LLAVE_PEM', 'TIMBOX_MANIFIESTO_LLAVE_PATH');

  if (method === 'firmar_manifiesto_sello') {
    return {
      username,
      password,
      manifiestoMethod: method,
      email,
      cadena: env('TIMBOX_MANIFIESTO_CADENA'),
      sello: env('TIMBOX_MANIFIESTO_SELLO'),
      certificado,
      manifiestoWsdl
    };
  }

  return {
    username,
    password,
    manifiestoMethod: method,
    email,
    rfc: env('TIMBOX_MANIFIESTO_RFC'),
    razon_social: env('TIMBOX_MANIFIESTO_RAZON_SOCIAL'),
    cert_pem: certificado,
    llave_pem: llavePem,
    manifiestoWsdl
  };
}

function validateConfig(method, adapterUrl, payload) {
  const missing = [];

  if (!adapterUrl) missing.push('TIMBOX_ADAPTER_MANIFIESTO_URL|TIMBOX_ADAPTER_URL');
  if (!env('TIMBOX_USERNAME')) missing.push('TIMBOX_USERNAME');
  if (!env('TIMBOX_PASSWORD')) missing.push('TIMBOX_PASSWORD');

  for (const key of requiredByMethod(method)) {
    if (!env(key)) missing.push(key);
  }

  if (method === 'firmar_manifiesto_sello') {
    if (!payload.certificado) {
      missing.push('TIMBOX_MANIFIESTO_CERTIFICADO_PEM|TIMBOX_MANIFIESTO_CERTIFICADO_PATH');
    }
  } else {
    if (!payload.cert_pem) {
      missing.push('TIMBOX_MANIFIESTO_CERTIFICADO_PEM|TIMBOX_MANIFIESTO_CERTIFICADO_PATH');
    }
    if (!payload.llave_pem) {
      missing.push('TIMBOX_MANIFIESTO_LLAVE_PEM|TIMBOX_MANIFIESTO_LLAVE_PATH');
    }
  }

  return missing;
}

function normalizeResult(input, responseMeta, runtimeMs) {
  const code = String(input?.code || '').trim();
  const message = String(input?.message || '').trim();
  const manifiesto = input?.manifiesto && typeof input.manifiesto === 'object' ? input.manifiesto : undefined;

  const status = code === '200' ? 'PASS' : 'FAIL';
  return {
    status,
    code: code || 'N/A',
    message: message || (status === 'PASS' ? 'OK' : 'Missing code/message in response'),
    runtimeMs,
    responseMeta,
    manifiestoSummary: manifiesto
      ? {
          hasEncabezado: Boolean(manifiesto.encabezado),
          hasContenido: Boolean(manifiesto.contenido),
          hasFirma: Boolean(manifiesto.firma),
          hasCadenaOriginal: Boolean(manifiesto.cadena_original),
          hasCertificado: Boolean(manifiesto.certificado)
        }
      : null
  };
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# Timbox Manifest E2E Report');
  lines.push('');
  lines.push(`- generatedAt: ${report.generatedAt}`);
  lines.push(`- status: ${report.status}`);
  lines.push(`- method: ${report.method}`);
  lines.push(`- wsdl: ${report.wsdl}`);
  lines.push(`- adapterUrl: ${report.adapterUrl}`);
  lines.push(`- runtimeMs: ${report.runtimeMs}`);
  if (report.code) lines.push(`- code: ${report.code}`);
  if (report.message) lines.push(`- message: ${report.message}`);
  lines.push('');

  lines.push('## Config Snapshot');
  lines.push(`- TIMBOX_USERNAME: ${report.config.usernameMasked}`);
  lines.push(`- TIMBOX_PASSWORD: ${report.config.passwordMasked}`);
  lines.push(`- TIMBOX_MANIFIESTO_EMAIL: ${report.config.emailMasked}`);
  lines.push(`- TIMBOX_MANIFIESTO_CERTIFICADO: ${report.config.hasCertificado ? 'present' : 'missing'}`);
  lines.push(`- TIMBOX_MANIFIESTO_LLAVE: ${report.config.hasLlave ? 'present' : 'missing'}`);

  if (report.missing?.length) {
    lines.push('');
    lines.push('## Missing Config');
    for (const item of report.missing) {
      lines.push(`- ${item}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(reportJsonPath), { recursive: true });
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(reportMdPath, buildMarkdown(report), 'utf8');
}

function printSummary(report) {
  const lines = [
    'Timbox Manifest E2E Check',
    '==========================',
    `Status: ${report.status}`,
    `Method: ${report.method}`,
    `WSDL: ${report.wsdl}`,
    `Adapter URL: ${report.adapterUrl}`,
    `Runtime: ${report.runtimeMs}ms`
  ];

  if (report.code) lines.push(`Code: ${report.code}`);
  if (report.message) lines.push(`Message: ${report.message}`);
  if (report.missing?.length) {
    lines.push('Missing config:');
    for (const item of report.missing) lines.push(`- ${item}`);
  }

  process.stdout.write(`${lines.join('\n')}\n`);
}

async function main() {
  const started = Date.now();
  const method = env('TIMBOX_MANIFIESTO_METHOD') || 'firmar_manifiesto';
  const adapterUrl = resolveAdapterUrl();
  const payload = buildPayload(method);
  const missing = validateConfig(method, adapterUrl, payload);

  const baseReport = {
    generatedAt: new Date().toISOString(),
    status: 'BLOCKED',
    method,
    wsdl: payload.manifiestoWsdl,
    adapterUrl,
    runtimeMs: Date.now() - started,
    code: null,
    message: null,
    missing,
    config: {
      usernameMasked: mask(env('TIMBOX_USERNAME')),
      passwordMasked: mask(env('TIMBOX_PASSWORD')),
      emailMasked: mask(env('TIMBOX_MANIFIESTO_EMAIL')),
      hasCertificado: Boolean(payload.cert_pem || payload.certificado),
      hasLlave: Boolean(payload.llave_pem)
    }
  };

  if (missing.length > 0) {
    baseReport.message = 'Missing required config for selected manifest method.';
    writeReport(baseReport);
    if (markdownMode) {
      process.stdout.write(buildMarkdown(baseReport));
    } else {
      printSummary(baseReport);
    }
    process.exit(strictMode ? 2 : 0);
  }

  const timeoutMs = Number(env('TIMBOX_TIMEOUT_MS') || '30000');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(adapterUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const raw = await response.text();
    let data = {};
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw };
    }

    if (!response.ok) {
      const failReport = {
        ...baseReport,
        status: 'FAIL',
        runtimeMs: Date.now() - started,
        code: String(data?.code || `HTTP_${response.status}`),
        message: String(data?.message || data?.detail || raw || 'HTTP error'),
        responseMeta: {
          httpStatus: response.status
        }
      };
      writeReport(failReport);
      if (markdownMode) {
        process.stdout.write(buildMarkdown(failReport));
      } else {
        printSummary(failReport);
      }
      process.exit(strictMode ? 3 : 0);
    }

    const normalized = normalizeResult(data, { httpStatus: response.status }, Date.now() - started);
    const finalReport = {
      ...baseReport,
      ...normalized,
      generatedAt: new Date().toISOString(),
      missing: []
    };

    writeReport(finalReport);
    if (markdownMode) {
      process.stdout.write(buildMarkdown(finalReport));
    } else {
      printSummary(finalReport);
    }

    if (strictMode && finalReport.status !== 'PASS') {
      process.exit(4);
    }
  } finally {
    clearTimeout(timeout);
  }
}

main().catch((error) => {
  const report = {
    generatedAt: new Date().toISOString(),
    status: 'FAIL',
    method: env('TIMBOX_MANIFIESTO_METHOD') || 'firmar_manifiesto',
    wsdl: env('TIMBOX_MANIFIESTO_WSDL') || 'https://staging.ws.timbox.com.mx/manifiesto/wsdl',
    adapterUrl: resolveAdapterUrl(),
    runtimeMs: 0,
    code: 'RUNTIME_ERROR',
    message: error instanceof Error ? error.message : String(error),
    missing: [],
    config: {
      usernameMasked: mask(env('TIMBOX_USERNAME')),
      passwordMasked: mask(env('TIMBOX_PASSWORD')),
      emailMasked: mask(env('TIMBOX_MANIFIESTO_EMAIL')),
      hasCertificado: Boolean(env('TIMBOX_MANIFIESTO_CERTIFICADO_PEM') || env('TIMBOX_MANIFIESTO_CERTIFICADO_PATH')),
      hasLlave: Boolean(env('TIMBOX_MANIFIESTO_LLAVE_PEM') || env('TIMBOX_MANIFIESTO_LLAVE_PATH'))
    }
  };

  writeReport(report);
  if (markdownMode) {
    process.stdout.write(buildMarkdown(report));
  } else {
    printSummary(report);
  }
  process.exit(1);
});
