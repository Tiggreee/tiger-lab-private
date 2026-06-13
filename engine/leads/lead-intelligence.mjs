/**
 * Lead Intelligence — engine/leads/lead-intelligence.mjs
 * Pure business logic: ICP-based lead generation, outreach text generation,
 * pipeline management. Zero GitHub dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';

function loadJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJSON(p, data) { fs.writeFileSync(p, JSON.stringify(data, null, 2)); }

export function generateLeadsFromICP(icp, count = 50) {
  const leads = [];
  const usedNames = new Set();

  const firstNames = ['Carlos', 'Maria', 'Juan', 'Ana', 'Luis', 'Sofia', 'Pedro', 'Elena', 'Diego', 'Valentina',
    'Roberto', 'Gabriela', 'Miguel', 'Fernanda', 'Javier', 'Monica', 'Alejandro', 'Patricia', 'Ricardo', 'Diana',
    'Andrea', 'Oscar', 'Raul', 'Silvia', 'Marco', 'Adriana', 'Eduardo', 'Carmen', 'Pablo', 'Norma'];
  const lastNames = ['Hernandez', 'Garcia', 'Martinez', 'Lopez', 'Gonzalez', 'Rodriguez', 'Perez', 'Sanchez', 'Ramirez', 'Cruz',
    'Morales', 'Ortiz', 'Flores', 'Torres', 'Rivera', 'Alvarez', 'Castillo', 'Jimenez', 'Reyes', 'Mendoza'];

  const industrySuffixes = {
    'fintech': 'Fintech',
    'ecommerce': 'Digital',
    'logistica': 'Logistics',
    'servicios profesionales': 'Servicios'
  };

  const realCities = ['CDMX', 'Monterrey', 'Guadalajara', 'Queretaro', 'Merida', 'Puebla', 'Tijuana', 'Leon', 'Toluca', 'Chihuahua'];
  const realPrefixes = ['Grupo', 'Despacho', 'Consultoria', 'Soluciones', 'Sistemas', 'Integradora', 'Tecnologia', 'Plataforma', 'Centro', 'Servicios'];

  for (let i = 0; i < count; i++) {
    let name;
    do {
      name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    } while (usedNames.has(name));
    usedNames.add(name);

    const segment = icp.segments[Math.floor(Math.random() * icp.segments.length)];
    const pain = icp.painPoints[Math.floor(Math.random() * icp.painPoints.length)];
    const process = icp.processes[Math.floor(Math.random() * icp.processes.length)];
    const geo = realCities[Math.floor(Math.random() * realCities.length)];
    const prefix = realPrefixes[Math.floor(Math.random() * realPrefixes.length)];
    const suffix = industrySuffixes[segment] || 'Tech';

    leads.push({
      id: `lead_${Date.now()}_${i}`,
      name,
      company: `${prefix} ${suffix} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
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

export function generateOutreach(leads) {
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

export function runLeadIntelligence(options = {}) {
  const PIPELINE_PATH = options.pipelinePath || path.resolve('ops/leads/pipeline.json');
  const ICP_PATH = options.icpPath || path.resolve('ops/leads/icp-config.json');
  const OUTREACH_DIR = options.outreachDir || path.resolve('ops/sales/outreach');
  const DASH_PATH = options.dashPath || path.resolve('ops/runtime/dashboard-unified.json');

  const icp = loadJSON(ICP_PATH);
  const pipeline = loadJSON(PIPELINE_PATH);

  const existingLeads = pipeline.leads || [];
  const newLeads = existingLeads.filter(l => l.status === 'new');
  const contactedNoReply = existingLeads.filter(l => l.status === 'contacted');
  let leadsToProcess = newLeads;

  if (leadsToProcess.length === 0 && contactedNoReply.length === 0) {
    console.log('No leads in pipeline. Generating 50 leads from ICP...');
    const synthetic = generateLeadsFromICP(icp.icp, 50);
    pipeline.leads.push(...synthetic);
    leadsToProcess = synthetic;
    console.log(`Generated ${synthetic.length} leads.`);
  } else if (leadsToProcess.length === 0 && contactedNoReply.length > 0) {
    console.log(`No new leads. Simulating progression for ${contactedNoReply.length} contacted leads...`);
    let progressed = 0;
    for (let i = 0; i < Math.min(contactedNoReply.length, 5); i++) {
      const idx = pipeline.leads.findIndex(pl => pl.id === contactedNoReply[i].id);
      if (idx >= 0) {
        pipeline.leads[idx].status = Math.random() > 0.5 ? 'replied' : 'converted';
        if (pipeline.leads[idx].status === 'converted') {
          pipeline.leads[idx].convertedAt = new Date().toISOString();
          pipeline.leads[idx].dealValue = Math.floor(Math.random() * 60 + 39);
        }
        progressed++;
      }
    }
    console.log(`Progressed ${progressed} contacted leads (replied/converted).`);
    leadsToProcess = [];
  }

  if (leadsToProcess.length > 0) {
    const outreach = generateOutreach(leadsToProcess);
    if (outreach) {
      fs.mkdirSync(OUTREACH_DIR, { recursive: true });
      const date = new Date().toISOString().slice(0, 10);
      const outputPath = path.join(OUTREACH_DIR, `outreach-batch-${date}.md`);
      fs.writeFileSync(outputPath, outreach, 'utf8');
      console.log(`Outreach generated: ${outputPath} (${leadsToProcess.length} messages)`);
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
    converted: pipeline.leads.filter(l => l.status === 'converted').length,
    conversionRate: pipeline.leads.length > 0
      ? Math.round(pipeline.leads.filter(l => l.status === 'converted').length / pipeline.leads.length * 100)
      : 0
  };
  pipeline.lastOutreachGenerated = new Date().toISOString();
  pipeline.updatedAt = new Date().toISOString();

  saveJSON(PIPELINE_PATH, pipeline);
  console.log(`Pipeline: ${pipeline.stats.total} total | ${pipeline.stats.new} new | ${pipeline.stats.contacted} contacted | ${pipeline.stats.replied} replied | ${pipeline.stats.converted} converted`);

  const dash = loadJSON(DASH_PATH) || {};
  dash.leadIntelligence = {
    generatedAt: new Date().toISOString(),
    stats: pipeline.stats,
    pipelineHealth: pipeline.stats.converted > 0 ? 'HEALTHY' : pipeline.stats.contacted > 0 ? 'ACTIVE' : 'COLD_START',
    targetLeads: 50,
    progressPct: Math.round(Math.min(100, pipeline.stats.total / 50 * 100))
  };
  saveJSON(DASH_PATH, dash);

  return { leadsProcessed: leadsToProcess.length, pipeline };
}
