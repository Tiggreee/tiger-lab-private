#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const TEMPLATES_PATH = path.resolve('ops/sales/outbound-templates.md');
const OUTPUT_DIR = path.resolve('ops/sales/outreach');

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

function generateMessages(leads) {
  const lines = [];
  lines.push('# Outreach Batch — Auto-generado');
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push(`# Total: ${leads.length} leads`);
  lines.push('');

  leads.forEach((lead, i) => {
    const pain = lead.pain || 'operaciones manuales';
    const industry = lead.industry || 'su industria';
    const manualProcess = lead.process || 'procesos manuales';
    const firstName = lead.name || lead.first_name || `Lead ${i + 1}`;
    const company = lead.company || 'tu empresa';

    lines.push(`## ${i + 1}. ${firstName} — ${company}`);
    lines.push('');
    lines.push('**LinkedIn DM (opening):**');
    lines.push('');
    lines.push(`Hola ${firstName},`);
    lines.push('');
    lines.push(`Vi que ${company} está en ${industry}.`);
    lines.push(`¿Siguen haciendo ${manualProcess} manualmente?`);
    lines.push('');
    lines.push(`En mi experiencia, equipos como el tuyo gastan 10+h/semana ahí. Armé un diagnostic de 15 min donde identifico exactamente qué automatizar.`);
    lines.push('');
    lines.push('Sin compromiso, sin venta. Solo te digo si hay oportunidad real.');
    lines.push('');
    lines.push('¿Te parece?');
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}

function main() {
  const args = parseArgs();
  const leadsInput = args.leads || args.input || '';

  let leads = [];
  if (leadsInput && fs.existsSync(leadsInput)) {
    const raw = fs.readFileSync(leadsInput, 'utf8').replace(/^\uFEFF/, '');
    leads = JSON.parse(raw);
  } else if (leadsInput) {
    try {
      leads = JSON.parse(leadsInput);
    } catch {
      console.error('Invalid JSON input. Use --leads path/to/leads.json or pipe JSON array');
      process.exit(1);
    }
  } else {
    console.error('Usage: generate-outreach.mjs --leads leads.json');
    console.error('leads.json format: [{ "name": "...", "company": "...", "industry": "...", "pain": "...", "process": "..." }]');
    process.exit(1);
  }

  if (!Array.isArray(leads) || leads.length === 0) {
    console.error('Leads must be a non-empty array');
    process.exit(1);
  }

  const messages = generateMessages(leads);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const outputPath = path.join(OUTPUT_DIR, `outreach-batch-${date}.md`);
  fs.writeFileSync(outputPath, messages, 'utf8');
  console.log(`Generated ${leads.length} personalized messages`);
  console.log(`Saved: ${outputPath}`);
}

main();
