#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const markdownMode = args.includes('--markdown');
const strictMode = args.includes('--strict');

const reportJsonPath = path.resolve('ops/runtime/timbox-cfdi-inspect-report.json');
const reportMdPath = path.resolve('ops/runtime/timbox-cfdi-inspect-report.md');

function env(name) {
  return (process.env[name] || '').trim();
}

function loadSxml() {
  const inline = env('TIMBOX_SXML_BASE64');
  if (inline) {
    return { source: 'TIMBOX_SXML_BASE64', sxml: inline };
  }

  const xmlPath = env('TIMBOX_SXML_PATH');
  if (!xmlPath) {
    return { source: 'missing', sxml: '' };
  }

  const resolved = path.resolve(xmlPath);
  try {
    const xml = fs.readFileSync(resolved, 'utf8').trim();
    if (!xml) {
      return { source: resolved, sxml: '' };
    }
    return {
      source: resolved,
      sxml: Buffer.from(xml, 'utf8').toString('base64')
    };
  } catch {
    return { source: resolved, sxml: '' };
  }
}

function extractXmlAttribute(xml, name) {
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`\\b${escaped}="([^"]*)"`);
  const match = xml.match(matcher);
  return match?.[1]?.trim() || '';
}

function validateSxml(sxml) {
  const errors = [];
  let xml = '';

  try {
    xml = Buffer.from(sxml, 'base64').toString('utf8');
  } catch {
    errors.push('SXML is not valid base64.');
  }

  if (!xml || !xml.includes('<cfdi:Comprobante')) {
    errors.push('SXML decoded payload does not contain cfdi:Comprobante root.');
  }

  const noCertificado = extractXmlAttribute(xml, 'NoCertificado');
  const certificado = extractXmlAttribute(xml, 'Certificado');
  const sello = extractXmlAttribute(xml, 'Sello');
  const fecha = extractXmlAttribute(xml, 'Fecha');

  if (!noCertificado) {
    errors.push('cfdi:Comprobante NoCertificado is required.');
  } else if (!/^[0-9]{20}$/.test(noCertificado)) {
    if (noCertificado.length > 100) {
      errors.push('NoCertificado appears to contain full certificate content instead of 20-digit serial.');
    } else {
      errors.push(`NoCertificado must match [0-9]{20}. Received '${noCertificado}'.`);
    }
  }

  if (!certificado) {
    errors.push('cfdi:Comprobante Certificado is required.');
  } else if (!/^[A-Za-z0-9+/=]+$/.test(certificado)) {
    errors.push('Certificado must be base64 DER without PEM headers.');
  } else if (certificado.length < 300) {
    errors.push('Certificado length is suspiciously short. Expected full base64 DER certificate content.');
  }

  if (!sello) {
    errors.push('cfdi:Comprobante Sello is required.');
  } else if (!/^[A-Za-z0-9+/=]+$/.test(sello)) {
    errors.push('Sello must be valid base64.');
  }

  if (fecha) {
    const issuedAt = new Date(fecha);
    if (!Number.isNaN(issuedAt.getTime()) && issuedAt.getTime() > Date.now() + 2 * 60 * 1000) {
      errors.push('Fecha in cfdi:Comprobante is in the future (timezone mismatch risk).');
    }
  }

  return {
    xml,
    noCertificado,
    certificadoLength: certificado.length,
    selloLength: sello.length,
    fecha,
    errors
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push('# Timbox CFDI Inspect Report');
  lines.push('');
  lines.push(`- generatedAt: ${report.generatedAt}`);
  lines.push(`- status: ${report.status}`);
  lines.push(`- source: ${report.source}`);
  lines.push(`- noCertificado: ${report.noCertificado || 'missing'}`);
  lines.push(`- certificadoLength: ${report.certificadoLength}`);
  lines.push(`- selloLength: ${report.selloLength}`);
  lines.push(`- fecha: ${report.fecha || 'missing'}`);
  lines.push('');

  lines.push('## Errors');
  if (report.errors.length === 0) {
    lines.push('- none');
  } else {
    for (const err of report.errors) {
      lines.push(`- ${err}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(reportJsonPath), { recursive: true });
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(reportMdPath, toMarkdown(report), 'utf8');
}

function printSummary(report) {
  const lines = [
    'Timbox CFDI Inspect',
    '===================',
    `Status: ${report.status}`,
    `Source: ${report.source}`,
    `NoCertificado: ${report.noCertificado || 'missing'}`,
    `Certificado length: ${report.certificadoLength}`,
    `Sello length: ${report.selloLength}`,
    `Fecha: ${report.fecha || 'missing'}`
  ];

  if (report.errors.length > 0) {
    lines.push('Errors:');
    for (const err of report.errors) {
      lines.push(`- ${err}`);
    }
  }

  process.stdout.write(`${lines.join('\n')}\n`);
}

function main() {
  const { source, sxml } = loadSxml();
  const validation = validateSxml(sxml);
  const report = {
    generatedAt: new Date().toISOString(),
    status: validation.errors.length === 0 ? 'PASS' : 'FAIL',
    source,
    noCertificado: validation.noCertificado,
    certificadoLength: validation.certificadoLength,
    selloLength: validation.selloLength,
    fecha: validation.fecha,
    errors: validation.errors
  };

  writeReport(report);

  if (markdownMode) {
    process.stdout.write(toMarkdown(report));
  } else {
    printSummary(report);
  }

  if (strictMode && report.status !== 'PASS') {
    process.exit(2);
  }
}

main();
