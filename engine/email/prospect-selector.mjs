#!/usr/bin/env node
/**
 * Prospect Selector — engine/email/prospect-selector.mjs
 * CORE ENGINE. Zero GitHub dependency. Portable.
 * 
 * Selects 1000 real prospects from the lead database using:
 * - ICP fit scoring
 * - Industry segmentation
 * - Campaign-specific targeting rules
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const DEFAULT_DB = resolve('ops/database/leads.db');
const DEFAULT_OUT = resolve('ops/runtime/campaign-prospects.json');

function loadConfig(campaignType) {
  /** @typedef {Object} CampaignConfig */
  const configs = {
    facturacion: {
      industries: ['facturación', 'contabilidad', 'financiero', 'fintech'],
      minIcpFit: 0,
      maxProspects: 1000,
      priorityCities: ['CDMX', 'Monterrey', 'Guadalajara']
    },
    documentacion: {
      industries: ['consultoría', 'software', 'administración'],
      minIcpFit: 0,
      maxProspects: 1000,
      priorityCities: ['CDMX', 'Guadalajara', 'San Luis Potosí']
    },
    automacion: {
      industries: ['automatización', 'software', 'consultoría', 'rrhh'],
      minIcpFit: 0,
      maxProspects: 1000,
      priorityCities: ['CDMX', 'Monterrey', 'Guadalajara', 'Puebla']
    },
    general: {
      industries: ['contabilidad', 'facturación', 'consultoría', 'software', 'financiero', 'fintech', 'automatización'],
      minIcpFit: 0,
      maxProspects: 1000,
      priorityCities: ['CDMX', 'Monterrey', 'Guadalajara']
    }
  };
  
  return configs[campaignType] || configs.general;
}

async function loadLeads() {
  const csvPath = resolve('ops/database/exports/companies.csv');
  try {
    const csv = readFileSync(csvPath, 'utf8');
    const lines = csv.trim().split('\n').slice(1);
    return lines.map(line => {
      const cols = line.split(',');
      return { name: cols[1], industry: cols[3] || '', city: cols[8] || '', website: cols[5] || '', phone: cols[6] || '' };
    });
  } catch {
    try {
      const raw = readFileSync(resolve('ops/database/seed-companies.json'), 'utf8');
      const seed = JSON.parse(raw);
      return seed.companies || [];
    } catch {
      return [];
    }
  }
}

function scoreProspect(company, config) {
  let score = 0;
  
  if (config.industries.includes(company.industry)) score += 30;
  if (config.priorityCities.includes(company.city)) score += 20;
  if (company.website) score += 10;
  if (company.phone) score += 10;
  if (company.industry === 'facturación') score += 15;
  if (company.industry === 'contabilidad') score += 10;
  if (company.city === 'CDMX') score += 5;
  
  return score;
}

function selectProspects(companies, config) {
  const scored = companies
    .map(c => ({ ...c, _score: scoreProspect(c, config) }))
    .filter(c => c._score >= config.minIcpFit)
    .sort((a, b) => b._score - a._score)
    .slice(0, config.maxProspects);
  
  return scored.map(({ _score, ...c }, i) => ({
    id: `PROSP-${String(i + 1).padStart(4, '0')}`,
    ...c,
    score: _score,
    campaignReady: true
  }));
}

function exportToCSV(prospects, outPath) {
  const header = 'id,name,industry,city,website,phone,score,campaignReady';
  const rows = prospects.map(p => 
    `${p.id},"${p.name}",${p.industry},${p.city},${p.website || ''},${p.phone || ''},${p.score},true`
  );
  return [header, ...rows].join('\n');
}

function exportToJSON(prospects, outPath) {
  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    total: prospects.length,
    prospects
  }, null, 2);
}

function main() {
  const args = process.argv.slice(2);
  const campaign = args.find(a => !a.startsWith('--')) || 'general';
  const outDir = args.includes('--out') 
    ? args[args.indexOf('--out') + 1] 
    : 'ops/runtime';
  
  const config = loadConfig(campaign);
  
  loadLeads().then(companies => {
    if (!companies.length) {
      console.error('❌ No leads found. Run lead-engine first.');
      process.exit(1);
    }
    
    const prospects = selectProspects(companies, config);
    
    mkdirSync(outDir, { recursive: true });
    
    const jsonPath = resolve(outDir, `campaign-prospects-${campaign}.json`);
    writeFileSync(jsonPath, exportToJSON(prospects, outDir), 'utf8');
    
    const csvPath = resolve(outDir, `campaign-prospects-${campaign}.csv`);
    writeFileSync(csvPath, exportToCSV(prospects, outDir), 'utf8');
    
    console.log(`=== PROSPECT SELECTOR ===`);
    console.log(`Campaign: ${campaign}`);
    console.log(`Total companies: ${companies.length}`);
    console.log(`Selected prospects: ${prospects.length}`);
    console.log(`Config: ${JSON.stringify(config)}`);
    console.log(`\nBy Industry:`);
    const byIndustry = {};
    prospects.forEach(p => { byIndustry[p.industry] = (byIndustry[p.industry] || 0) + 1; });
    Object.entries(byIndustry).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
    console.log(`\nBy City:`);
    const byCity = {};
    prospects.forEach(p => { byCity[p.city] = (byCity[p.city] || 0) + 1; });
    Object.entries(byCity).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
    console.log(`\n✅ JSON: ${jsonPath}`);
    console.log(`✅ CSV: ${csvPath}`);
  });
}

main();
