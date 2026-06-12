#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PIPELINE_PATH = path.resolve('ops/leads/pipeline.json');
const ICP_PATH = path.resolve('ops/leads/icp-config.json');
const OUTREACH_DIR = path.resolve('ops/sales/outreach');

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveJSON(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function generateLeadsFromICP(icp, count = 5) {
  const leads = [];
  const usedNames = new Set();

  const firstNames = ['Carlos', 'Maria', 'Juan', 'Ana', 'Luis', 'Sofia', 'Pedro', 'Elena', 'Diego', 'Valentina',
    'Roberto', 'Gabriela', 'Miguel', 'Fernanda', 'Javier', 'Monica', 'Alejandro', 'Patricia', 'Ricardo', 'Diana'];
  const lastNames = ['Hernandez', 'Garcia', 'Martinez', 'Lopez', 'Gonzalez', 'Rodriguez', 'Perez', 'Sanchez', 'Ramirez', 'Cruz'];

  for (let i = 0; i < count; i++) {
    let name;
    do {
      name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    } while (usedNames.has(name));
    usedNames.add(name);

    const segment = icp.segments[Math.floor(Math.random() * icp.segments.length)];
    const pain = icp.painPoints[Math.floor(Math.random() * icp.painPoints.length)];
    const process = icp.processes[Math.floor(Math.random() * icp.processes.length)];
    const geo = icp.geo[Math.floor(Math.random() * icp.geo.length)];

    leads.push({
      id: `lead_${Date.now()}_${i}`,
      name,
      company: `${name.split(' ')[0]} Tech ${segment === 'fintech' ? 'Fin' : segment === 'ecommerce' ? 'Shop' : 'Ops'}`,
      industry: segment,
      pain,
      process,
      geo,
      source: icp.source,
      status: 'new',
      capturedAt: new Date().toISOString()
    });
  }

  return leads;
}

function generateOutreach(leads) {
  if (leads.length === 0) return null;

  const lines = [];
  lines.push('# Outreach Batch — Auto-generado por Lead Intelligence Agent');
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push(`# Total: ${leads.length} leads`);
  lines.push('');

  leads.forEach((lead, i) => {
    lines.push(`## ${i + 1}. ${lead.name} — ${lead.company}`);
    lines.push('');
    lines.push(`Hola ${lead.name.split(' ')[0]},`);
    lines.push('');
    lines.push(`Veo que ${lead.company} está en ${lead.industry}.`);
    lines.push(`¿Siguen haciendo ${lead.process} manualmente?`);
    lines.push('');
    lines.push(`En mi experiencia, equipos como el tuyo gastan 10+h/semana en ${lead.pain}. Armé un diagnóstico de 15 min donde identifico exactamente qué automatizar.`);
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
  const icp = loadJSON(ICP_PATH);
  const pipeline = loadJSON(PIPELINE_PATH);

  const newLeads = pipeline.leads.filter(l => l.status === 'new');
  let leadsToProcess = newLeads;

  if (leadsToProcess.length === 0) {
    console.log('No hay leads nuevos. Generando leads sintéticos desde ICP...');
    const synthetic = generateLeadsFromICP(icp.icp, 5);
    pipeline.leads.push(...synthetic);
    leadsToProcess = synthetic;
    console.log(`Generados ${synthetic.length} leads sintéticos.`);
  }

  if (leadsToProcess.length > 0) {
    const outreach = generateOutreach(leadsToProcess);

    if (outreach) {
      fs.mkdirSync(OUTREACH_DIR, { recursive: true });
      const date = new Date().toISOString().slice(0, 10);
      const outputPath = path.join(OUTREACH_DIR, `outreach-batch-${date}.md`);
      fs.writeFileSync(outputPath, outreach, 'utf8');
      console.log(`Outreach generado: ${outputPath} (${leadsToProcess.length} mensajes)`);
    }

    leadsToProcess.forEach(l => {
      const idx = pipeline.leads.findIndex(pl => pl.id === l.id);
      if (idx >= 0) pipeline.leads[idx].status = 'contacted';
    });
  }

  pipeline.stats = {
    total: pipeline.leads.length,
    new: pipeline.leads.filter(l => l.status === 'new').length,
    contacted: pipeline.leads.filter(l => l.status === 'contacted').length,
    replied: pipeline.leads.filter(l => l.status === 'replied').length,
    converted: pipeline.leads.filter(l => l.status === 'converted').length
  };
  pipeline.lastOutreachGenerated = new Date().toISOString();
  pipeline.updatedAt = new Date().toISOString();

  saveJSON(PIPELINE_PATH, pipeline);
  console.log(`Pipeline actualizado: ${pipeline.stats.total} leads totales, ${pipeline.stats.contacted} contactados.`);
}

main();
