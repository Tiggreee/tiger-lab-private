
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
