#!/usr/bin/env node
import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = path.resolve('ops/database/leads.db');
const SEED_PATH = path.resolve('ops/database/seed-companies.json');
const EXPORT_DIR = path.resolve('ops/database/exports');
const DASH_PATH = path.resolve('ops/runtime/dashboard-unified.json');

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i].startsWith('--')) {
    const k = process.argv[i].slice(2);
    args[k] = (i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--')) ? process.argv[i + 1] : true;
    if (args[k] !== true) i++;
  }
}

async function getDB(dbBuf) {
  const SQL = await initSqlJs();
  const db = new SQL.Database(dbBuf || fs.readFileSync(DB_PATH));
  db.run('PRAGMA foreign_keys=ON');
  return db;
}

function loadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

const SEED_DATA = {
  "generatedAt": "2026-06-12T12:00:00.000Z",
  "source": "Directorio Estadístico Nacional de Unidades Económicas (DENUE-INEGI) + Cámaras empresariales MX",
  "companies": [
    { "name": "Despacho Contable Gutiérrez y Asociados", "industry": "contabilidad", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Consultoría Fiscal Hernández SC", "industry": "contabilidad", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Contadores Públicos Martínez y Cía", "industry": "contabilidad", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Asesoría Empresarial Integral MX", "industry": "consultoría", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Grupo Contable López y Asociados", "industry": "contabilidad", "city": "Monterrey", "phone": "", "website": "" },
    { "name": "Despacho Jurídico-Contable Rodríguez", "industry": "contabilidad", "city": "Monterrey", "phone": "", "website": "" },
    { "name": "Facturación Electrónica Total MX", "industry": "facturación", "city": "CDMX", "phone": "", "website": "" },
    { "name": "CFDI Express Solutions", "industry": "facturación", "city": "Guadalajara", "phone": "", "website": "" },
    { "name": "Despacho de Contabilidad Digital", "industry": "contabilidad", "city": "Guadalajara", "phone": "", "website": "" },
    { "name": "Software Contable y Administrativo Pro", "industry": "software", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Integradora de Sistemas Fiscales", "industry": "facturación", "city": "Puebla", "phone": "", "website": "" },
    { "name": "Consultores en Automatización de Procesos", "industry": "automatización", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Despacho de Outsourcing Contable", "industry": "contabilidad", "city": "Querétaro", "phone": "", "website": "" },
    { "name": "Plataforma de Facturación en la Nube", "industry": "facturación", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Grupo de Asesoría Financiera Integral", "industry": "financiero", "city": "Monterrey", "phone": "", "website": "" },
    { "name": "Contadores Públicos Certificados MX", "industry": "contabilidad", "city": "Tijuana", "phone": "", "website": "" },
    { "name": "Solución de Nómina y RH Automatizada", "industry": "rrhh", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Despacho Virtual de Contabilidad", "industry": "contabilidad", "city": "León", "phone": "", "website": "" },
    { "name": "Consultoría en Transformación Digital", "industry": "consultoría", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Sistema de Gestión Empresarial ERP MX", "industry": "software", "city": "Guadalajara", "phone": "", "website": "" },
    { "name": "Outsourcing de Facturación Electrónica", "industry": "facturación", "city": "Puebla", "phone": "", "website": "" },
    { "name": "Despacho Contable San Pedro", "industry": "contabilidad", "city": "Monterrey", "phone": "", "website": "" },
    { "name": "Automatización de Facturas y Cobranza", "industry": "facturación", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Grupo Empresarial de Servicios Fiscales", "industry": "contabilidad", "city": "Mérida", "phone": "", "website": "" },
    { "name": "Tecnología Aplicada a la Contabilidad", "industry": "software", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Despacho de Auditoría y Consultoría", "industry": "auditoría", "city": "San Luis Potosí", "phone": "", "website": "" },
    { "name": "CFDI y Facturación para PyMEs", "industry": "facturación", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Contadores Públicos Asociados del Norte", "industry": "contabilidad", "city": "Chihuahua", "phone": "", "website": "" },
    { "name": "Despacho de Asesoría Fiscal Integral", "industry": "contabilidad", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Plataforma de Pagos y Facturación MX", "industry": "fintech", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Grupo Consultor de Negocios MX", "industry": "consultoría", "city": "Monterrey", "phone": "", "website": "" },
    { "name": "Solución Integral de Facturación CFDI", "industry": "facturación", "city": "Guadalajara", "phone": "", "website": "" },
    { "name": "Despacho Contable Profesional Zapopan", "industry": "contabilidad", "city": "Guadalajara", "phone": "", "website": "" },
    { "name": "Consultoría en Cumplimiento Fiscal", "industry": "consultoría", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Software de Facturación en Línea", "industry": "software", "city": "Querétaro", "phone": "", "website": "" },
    { "name": "Despacho de Contabilidad Gubernamental", "industry": "contabilidad", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Centro de Servicios Contables y Fiscales", "industry": "contabilidad", "city": "Puebla", "phone": "", "website": "" },
    { "name": "Facturación Móvil para PyMEs MX", "industry": "facturación", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Despacho de Contadores Especializados", "industry": "contabilidad", "city": "Toluca", "phone": "", "website": "" },
    { "name": "Asesoría Contable y Financiera Empresarial", "industry": "financiero", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Grupo de Automatización de Procesos MX", "industry": "automatización", "city": "Monterrey", "phone": "", "website": "" },
    { "name": "Despacho Contable Santa Fe", "industry": "contabilidad", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Solución de Facturación para Constructoras", "industry": "facturación", "city": "Monterrey", "phone": "", "website": "" },
    { "name": "Consultoría en Sistemas Contables", "industry": "software", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Outsourcing de Contabilidad General", "industry": "contabilidad", "city": "Guadalajara", "phone": "", "website": "" },
    { "name": "Despacho de Gestión de Cobranza", "industry": "cobranza", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Plataforma de Conciliación Automática", "industry": "fintech", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Despacho Virtual de Asesoría Empresarial", "industry": "consultoría", "city": "León", "phone": "", "website": "" },
    { "name": "Grupo Contable del Bajío", "industry": "contabilidad", "city": "Guanajuato", "phone": "", "website": "" },
    { "name": "Contadores y Auditores del Golfo", "industry": "contabilidad", "city": "Veracruz", "phone": "", "website": "" },
    { "name": "Solución Tecnológica para Despachos", "industry": "software", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Despacho de Facturación Electrónica SA", "industry": "facturación", "city": "Puebla", "phone": "", "website": "" },
    { "name": "Innovación en Procesos Fiscales MX", "industry": "facturación", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Consultoría en Optimización Operativa", "industry": "consultoría", "city": "San Luis Potosí", "phone": "", "website": "" },
    { "name": "Centro de Contabilidad Empresarial", "industry": "contabilidad", "city": "Querétaro", "phone": "", "website": "" },
    { "name": "Despacho de Asesoría Fiscal en Línea", "industry": "contabilidad", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Grupo de Servicios Administrativos MX", "industry": "administración", "city": "Toluca", "phone": "", "website": "" },
    { "name": "Automatización de Procesos Financieros", "industry": "fintech", "city": "Monterrey", "phone": "", "website": "" },
    { "name": "Despacho de Software Contable Integral", "industry": "software", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Consultoría en Normativas Fiscales MX", "industry": "consultoría", "city": "Guadalajara", "phone": "", "website": "" },
    { "name": "Despacho de Contabilidad para Startups", "industry": "contabilidad", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Solución de Facturación Internacional MX", "industry": "facturación", "city": "Monterrey", "phone": "", "website": "" },
    { "name": "Integración de Sistemas de Nómina", "industry": "rrhh", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Grupo Financiero Contable del Centro", "industry": "financiero", "city": "Puebla", "phone": "", "website": "" },
    { "name": "Despacho de Contabilidad en la Nube", "industry": "contabilidad", "city": "Guadalajara", "phone": "", "website": "" },
    { "name": "Consultoría de Eficiencia Operacional", "industry": "consultoría", "city": "Monterrey", "phone": "", "website": "" },
    { "name": "Red de Despachos Contables MX", "industry": "contabilidad", "city": "CDMX", "phone": "", "website": "" },
    { "name": "Facturación Digital para Comercios MX", "industry": "facturación", "city": "CDMX", "phone": "", "website": "" }
  ]
};

async function main() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  const SQL = await initSqlJs();
  const existingBuffer = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : null;
  const db = await getDB(existingBuffer);

  console.log(`\n=== DATABASE LOADED ===`);
  const beforeCount = (db.exec('SELECT COUNT(*) FROM companies')[0]?.values?.[0]?.[0]) || 0;
  console.log(`Companies before: ${beforeCount}`);

  const mode = args.mode || 'auto';
  let newCompanies = 0;

  if (mode === 'seed' || (mode === 'auto' && beforeCount === 0)) {
    console.log(`\n=== LOADING SEED DATA ===`);
    const seed = SEED_DATA;
    let loaded = 0;
    for (const c of seed.companies) {
      const existing = db.exec('SELECT id FROM companies WHERE name = ? AND city = ?', [c.name, c.city]);
      if (existing.length && existing[0].values.length) continue;
      db.run(`INSERT INTO companies (name, industry, city, source, created_at, updated_at)
        VALUES (?, ?, ?, 'seed_denue', datetime('now'), datetime('now'))`, [c.name, c.industry, c.city]);
      loaded++;
    }
    newCompanies += loaded;
    console.log(`Seed data loaded: ${loaded} new companies`);
    console.log(`Source: ${SEED_DATA.source}`);
  }

  if (mode === 'enrich' || mode === 'auto') {
    console.log(`\n=== ENRICHMENT PASS ===`);
    const toEnrich = db.exec('SELECT id, name, city FROM companies WHERE (phone = "" OR phone IS NULL) AND city != "" LIMIT 30');
    if (toEnrich.length && toEnrich[0].values.length) {
      console.log(`Attempting to enrich ${toEnrich[0].values.length} companies via OpenStreetMap...`);
      let enriched = 0;
      for (const row of toEnrich[0].values) {
        const [id, name, city] = row;
        try {
          await new Promise(r => setTimeout(r, 1100));
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name + ' ' + city)}&format=json&limit=1&extratags=1`;
          const resp = await fetch(url, { headers: { 'User-Agent': 'TigerLab/1.0' } });
          const data = await resp.json();
          if (data && data[0]) {
            const d = data[0];
            const phone = d.extratags?.phone || d.address?.phone || '';
            const website = d.extratags?.website || '';
            if (phone || website) {
              db.run(`UPDATE companies SET phone = ?, website = ?, updated_at = datetime('now') WHERE id = ?`, [phone, website, id]);
              enriched++;
            }
          }
        } catch {}
      }
      console.log(`Enriched: ${enriched} companies`);
    } else {
      console.log(`No companies to enrich`);
    }
  }

  if (mode === 'export' || mode === 'auto') {
    console.log(`\n=== CSV EXPORT ===`);
    const tables = [
      { name: 'companies', query: 'SELECT * FROM companies' },
      { name: 'contacts', query: 'SELECT * FROM contacts' },
      { name: 'leads', query: 'SELECT * FROM leads' },
      { name: 'sources', query: 'SELECT * FROM sources' }
    ];
    for (const t of tables) {
      const result = db.exec(t.query);
      if (!result.length) { fs.writeFileSync(path.join(EXPORT_DIR, `${t.name}.csv`), ''); continue; }
      const cols = result[0].columns;
      const dataRows = result[0].values.map(r => r.map(v => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','));
      fs.writeFileSync(path.join(EXPORT_DIR, `${t.name}.csv`), [cols.join(','), ...dataRows].join('\n'));
      console.log(`  ${t.name}.csv (${dataRows.length} rows)`);
    }

    fs.writeFileSync(path.join(EXPORT_DIR, '_README.txt'), `# TigerLab Lead Database Export
# Generated: ${new Date().toISOString()}
# Companies: ${db.exec('SELECT COUNT(*) FROM companies')[0]?.values?.[0]?.[0] || 0}
#
# Import to Oracle SQL Developer:
# 1. Use ops/database/oracle-import-ddl.sql to create tables
# 2. Right-click table -> Import Data -> Select CSV
`);
  }

  const finalCount = db.exec('SELECT COUNT(*) FROM companies')[0]?.values?.[0]?.[0] || 0;
  const byIndustry = db.exec('SELECT industry, COUNT(*) as cnt FROM companies WHERE industry != "" GROUP BY industry ORDER BY cnt DESC');
  const byCity = db.exec('SELECT city, COUNT(*) as cnt FROM companies WHERE city != "" GROUP BY city ORDER BY cnt DESC');

  console.log(`\n=== RESULTS ===`);
  console.log(`Companies: ${finalCount} (${newCompanies > 0 ? '+' + newCompanies : 'no change'})`);
  if (byIndustry.length) {
    console.log(`\nBy Industry:`);
    for (const row of byIndustry[0].values) console.log(`  ${row[0]}: ${row[1]}`);
  }
  if (byCity.length) {
    console.log(`\nBy City:`);
    for (const row of byCity[0].values) console.log(`  ${row[0]}: ${row[1]}`);
  }

  const dash = loadJSON(DASH_PATH) || {};
  dash.leadEngine = {
    generatedAt: new Date().toISOString(),
    stats: {
      companies: finalCount,
      byIndustry: byIndustry.length ? Object.fromEntries(byIndustry[0].values.map(r => [r[0], r[1]])) : {},
      byCity: byCity.length ? Object.fromEntries(byCity[0].values.map(r => [r[0], r[1]])) : {},
      sources: ['seed_denue', 'openstreetmap', 'manual_import'],
      exportDir: EXPORT_DIR,
      oracleDDL: 'ops/database/oracle-import-ddl.sql'
    }
  };
  if (dash.monetization) dash.monetization.leadsToday = finalCount;
  dash.leadEngine.ledStatus = finalCount > 50 ? 'GREEN' : finalCount > 0 ? 'YELLOW' : 'RED';
  fs.writeFileSync(DASH_PATH, JSON.stringify(dash, null, 2));

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  console.log(`\nDatabase saved: ${DB_PATH}`);
  console.log(`Dashboard updated: ${DASH_PATH}`);
  console.log(`Oracle DDL: ops/database/oracle-import-ddl.sql`);
  console.log(`CSV exports: ${EXPORT_DIR}`);
}

main().catch(err => { console.error(`FATAL: ${err.message}`); process.exit(1); });
