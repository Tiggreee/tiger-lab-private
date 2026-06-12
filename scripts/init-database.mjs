#!/usr/bin/env node
import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';

const DB_DIR = path.resolve('ops/database');
const DB_PATH = path.join(DB_DIR, 'leads.db');
const SCHEMA_PATH = path.join(DB_DIR, 'schema.sql');
const ORACLE_DDL_PATH = path.join(DB_DIR, 'oracle-import-ddl.sql');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rfc TEXT,
  industry TEXT,
  size TEXT,
  website TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'MX',
  geo_lat REAL,
  geo_lng REAL,
  source TEXT,
  source_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_rfc ON companies(rfc);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER REFERENCES companies(id),
  full_name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  is_decision_maker INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER REFERENCES contacts(id),
  company_id INTEGER REFERENCES companies(id),
  status TEXT DEFAULT 'new',
  pain_points TEXT,
  source TEXT,
  score INTEGER DEFAULT 0,
  assigned_to TEXT,
  notes TEXT,
  first_contacted_at TEXT,
  last_contacted_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_contact ON leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);

CREATE TABLE IF NOT EXISTS interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER REFERENCES leads(id),
  type TEXT,
  direction TEXT DEFAULT 'outbound',
  subject TEXT,
  content TEXT,
  outcome TEXT,
  scheduled_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_interactions_lead ON interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type);

CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT,
  is_active INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  last_run_at TEXT,
  total_leads_generated INTEGER DEFAULT 0,
  total_companies_discovered INTEGER DEFAULT 0,
  cost_per_lead REAL DEFAULT 0,
  config TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS source_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER REFERENCES sources(id),
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  leads_found INTEGER DEFAULT 0,
  leads_new INTEGER DEFAULT 0,
  errors TEXT,
  status TEXT DEFAULT 'running'
);

CREATE TABLE IF NOT EXISTS github_credits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL,
  resource TEXT NOT NULL,
  limit_amount REAL,
  used_amount REAL DEFAULT 0,
  unit TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO sources (id, name, type, is_active, priority, config)
VALUES (1, 'google_maps_places_api', 'api', 0, 1, '{"description":"Google Maps Places API - free tier 30k req/mo","api_name":"Places API","endpoint":"https://maps.googleapis.com/maps/api/place/textsearch/json","query_template":"{query} en {city}","cost_per_request":0,"monthly_free_quota":30000}');

INSERT OR IGNORE INTO sources (id, name, type, is_active, priority, config)
VALUES (2, 'google_maps_nearby_search', 'api', 0, 2, '{"description":"Google Maps Nearby Search - find by location","api_name":"Nearby Search","endpoint":"https://maps.googleapis.com/maps/api/place/nearbysearch/json","cost_per_request":0,"monthly_free_quota":30000}');

INSERT OR IGNORE INTO sources (id, name, type, is_active, priority, config)
VALUES (3, 'directorio_mx', 'scraper', 1, 3, '{"description":"Directorio MX - public business directory","base_url":"https://www.directorio.com.mx","type":"free_directory"}');

INSERT OR IGNORE INTO sources (id, name, type, is_active, priority, config)
VALUES (4, 'seccion_amarilla_mx', 'scraper', 1, 4, '{"description":"Seccion Amarilla Mexico","base_url":"https://www.seccionamarilla.com.mx","type":"free_directory"}');

INSERT OR IGNORE INTO sources (id, name, type, is_active, priority, config)
VALUES (5, 'manual_import', 'manual', 1, 0, '{"description":"CSV manual import from Victor"}');

INSERT OR IGNORE INTO github_credits (month, resource, limit_amount, used_amount, unit)
VALUES (strftime('%Y-%m', 'now'), 'actions_minutes', 50000, 0, 'minutes');

INSERT OR IGNORE INTO github_credits (month, resource, limit_amount, used_amount, unit)
VALUES (strftime('%Y-%m', 'now'), 'actions_storage_gb', 50, 0, 'gb');

INSERT OR IGNORE INTO github_credits (month, resource, limit_amount, used_amount, unit)
VALUES (strftime('%Y-%m', 'now'), 'packages_data_transfer_gb', 100, 0, 'gb');

INSERT OR IGNORE INTO github_credits (month, resource, limit_amount, used_amount, unit)
VALUES (strftime('%Y-%m', 'now'), 'git_lfs_bandwidth_gb', 250, 0, 'gb');

INSERT OR IGNORE INTO github_credits (month, resource, limit_amount, used_amount, unit)
VALUES (strftime('%Y-%m', 'now'), 'github_startups_budget', 4982.40, 0, 'usd');

INSERT OR IGNORE INTO github_credits (month, resource, limit_amount, used_amount, unit)
VALUES (strftime('%Y-%m', 'now'), 'sandbox_budget_pct', 100, 0, 'percent');
`;

const ORACLE_DDL = `-- Oracle DDL for importing leads data from CSV export
-- Compatible with Oracle SQL Developer and Oracle Data tools

CREATE TABLE tigerlab_companies (
  id NUMBER PRIMARY KEY,
  name VARCHAR2(255) NOT NULL,
  rfc VARCHAR2(20),
  industry VARCHAR2(100),
  size VARCHAR2(50),
  website VARCHAR2(500),
  phone VARCHAR2(50),
  address VARCHAR2(500),
  city VARCHAR2(100),
  state VARCHAR2(100),
  country VARCHAR2(10) DEFAULT 'MX',
  geo_lat NUMBER(10,7),
  geo_lng NUMBER(10,7),
  source VARCHAR2(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tigerlab_contacts (
  id NUMBER PRIMARY KEY,
  company_id NUMBER REFERENCES tigerlab_companies(id),
  full_name VARCHAR2(255) NOT NULL,
  title VARCHAR2(200),
  email VARCHAR2(255),
  phone VARCHAR2(50),
  linkedin_url VARCHAR2(500),
  is_decision_maker NUMBER(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tigerlab_leads (
  id NUMBER PRIMARY KEY,
  contact_id NUMBER REFERENCES tigerlab_contacts(id),
  company_id NUMBER REFERENCES tigerlab_companies(id),
  status VARCHAR2(50) DEFAULT 'new',
  pain_points VARCHAR2(1000),
  source VARCHAR2(100),
  score NUMBER DEFAULT 0,
  assigned_to VARCHAR2(255),
  notes VARCHAR2(2000),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tigerlab_interactions (
  id NUMBER PRIMARY KEY,
  lead_id NUMBER REFERENCES tigerlab_leads(id),
  type VARCHAR2(50),
  direction VARCHAR2(20) DEFAULT 'outbound',
  subject VARCHAR2(500),
  content CLOB,
  outcome VARCHAR2(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_tl_companies_industry ON tigerlab_companies(industry);
CREATE INDEX idx_tl_companies_city ON tigerlab_companies(city);
CREATE INDEX idx_tl_contacts_email ON tigerlab_contacts(email);
CREATE INDEX idx_tl_leads_status ON tigerlab_leads(status);
CREATE INDEX idx_tl_leads_score ON tigerlab_leads(score);
CREATE INDEX idx_tl_interactions_lead ON tigerlab_interactions(lead_id);

-- Sequence for auto-increment (Oracle style)
CREATE SEQUENCE seq_tigerlab_companies START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_tigerlab_contacts START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_tigerlab_leads START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_tigerlab_interactions START WITH 1 INCREMENT BY 1;
`;

async function main() {
  fs.mkdirSync(DB_DIR, { recursive: true });

  const SQL = await initSqlJs();
  let db;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log(`Database loaded: ${DB_PATH}`);
  } else {
    db = new SQL.Database();
    console.log('New database created');
  }

  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA foreign_keys=ON');

  const statements = SCHEMA.split(';').filter(s => s.trim());
  let executed = 0;
  for (const stmt of statements) {
    try {
      db.run(stmt + ';');
      executed++;
    } catch (err) {
      console.error(`  Schema error (ignored): ${err.message.slice(0, 80)}`);
    }
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  console.log(`Schema: ${executed} statements executed`);
  console.log(`DB size: ${(data.length / 1024).toFixed(1)} KB`);

  fs.writeFileSync(SCHEMA_PATH, SCHEMA);
  fs.writeFileSync(ORACLE_DDL_PATH, ORACLE_DDL);

  db.run(`INSERT OR IGNORE INTO sources (name, type, is_active, priority, config)
    VALUES ('manual_import', 'manual', 1, 0, '{"description":"CSV manual import from Victor"}')`);

  console.log(`\nWritten:`);
  console.log(`  ${DB_PATH}`);
  console.log(`  ${SCHEMA_PATH}`);
  console.log(`  ${ORACLE_DDL_PATH}`);

  db.close();
  console.log(`\nDatabase ready. Oracle DDL at ops/database/oracle-import-ddl.sql`);
  console.log(`Import CSVs into Oracle with: SQL Developer -> Tables -> Import Data`);
}

main().catch(console.error);
