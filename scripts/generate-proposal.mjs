#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const TEMPLATE = path.resolve('ops/sales/proposal-template-3-tiers.md');
const OUTPUT_DIR = path.resolve('ops/sales/proposals');

function parseArgs() {
  const args = {};
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    if (raw[i].startsWith('--')) {
      const key = raw[i].slice(2);
      const val = raw[i + 1] && !raw[i + 1].startsWith('--') ? raw[i + 1] : '';
      args[key] = val;
      if (val) i++;
    }
  }
  return args;
}

function readTemplate() {
  if (!fs.existsSync(TEMPLATE)) {
    console.error(`Template not found: ${TEMPLATE}`);
    process.exit(1);
  }
  return fs.readFileSync(TEMPLATE, 'utf8');
}

function fillTemplate(template, vars) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(value || 'N/A');
  }
  result = result.split('{{#each tier1_deliverables}}').join('').split('{{/each}}').join('');
  result = result.split('{{#each tier2_extras}}').join('').split('{{/each}}').join('');
  result = result.split('{{#each tier3_extras}}').join('').split('{{/each}}').join('');
  return result;
}

function main() {
  const vars = parseArgs();
  const clientName = vars.client || vars.client_name || 'Cliente';
  const safeName = clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const template = readTemplate();

  const defaults = {
    client_name: clientName,
    proposal_date: new Date().toISOString().slice(0, 10),
    valid_until: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    client_problem: vars.problem || 'operaciones manuales sin automatizar',
    hours_per_week: vars.hours || '10+',
    sprint_duration: vars.duration || '2 semanas',
    tier1_name: vars.tier1_name || 'Security Hardening',
    tier1_price: vars.tier1_price || '600-1,400',
    tier1_when: vars.tier1_when || 'equipos sin baseline de seguridad',
    tier1_deliverables: vars.tier1_deliverables || '- Auditoría de seguridad\n  - Hardening CORS, auth, rate-limit\n  - Reporte de remediación',
    tier2_name: vars.tier2_name || 'API Foundation',
    tier2_price: vars.tier2_price || '900-1,800',
    tier2_when: vars.tier2_when || 'equipos con backend inestable',
    tier2_extras: vars.tier2_extras || '- REST API completa\n  - CI/CD pipeline\n  - Staging environment',
    tier3_name: vars.tier3_name || 'Full-Stack MVP',
    tier3_price: vars.tier3_price || '1,200-3,500',
    tier3_when: vars.tier3_when || 'negocios que necesitan un producto digital desde cero',
    tier3_extras: vars.tier3_extras || '- Web app + API\n  - Producción deploy\n  - Automatización de flujos',
    calendar_link: vars.calendar || 'https://cal.com/victor-tigerlab/diagnostic',
    contact_email: vars.email || 'victor@tigerlab.dev',
  };

  const filled = fillTemplate(template, { ...defaults, ...vars });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, `propuesta-${safeName}-${defaults.proposal_date}.md`);
  fs.writeFileSync(outputPath, filled, 'utf8');
  console.log(`Propuesta generada: ${outputPath}`);
}

main();
