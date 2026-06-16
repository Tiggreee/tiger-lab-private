-- TigerLab Event Database Schema
-- Stores ALL engine activity: pipeline, agents, decisions, revenue, MCP
-- SQLite (development) → Oracle-compatible DDL for production

-- Pipeline runs
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT UNIQUE NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  status TEXT DEFAULT 'running',
  steps_total INTEGER DEFAULT 0,
  steps_passed INTEGER DEFAULT 0,
  steps_failed INTEGER DEFAULT 0,
  duration_seconds REAL,
  triggered_by TEXT DEFAULT 'cron',
  error_log TEXT
);

-- Agent activity
CREATE TABLE IF NOT EXISTS agent_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT DEFAULT 'ok',
  details TEXT,
  run_id TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  duration_ms INTEGER,
  FOREIGN KEY (run_id) REFERENCES pipeline_runs(run_id)
);

-- Business decisions
CREATE TABLE IF NOT EXISTS decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  decision_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  score REAL,
  decided_by TEXT DEFAULT 'engine',
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  run_id TEXT,
  FOREIGN KEY (run_id) REFERENCES pipeline_runs(run_id)
);

-- Campaign events
CREATE TABLE IF NOT EXISTS campaign_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  product TEXT,
  event_type TEXT NOT NULL,
  channel TEXT,
  status TEXT,
  score INTEGER,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  run_id TEXT,
  FOREIGN KEY (run_id) REFERENCES pipeline_runs(run_id)
);

-- Revenue / transactions
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id TEXT UNIQUE,
  product TEXT,
  plan TEXT,
  amount REAL,
  currency TEXT DEFAULT 'USD',
  provider TEXT,
  status TEXT DEFAULT 'pending',
  customer TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

-- MCP activity
CREATE TABLE IF NOT EXISTS mcp_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT NOT NULL,
  action TEXT NOT NULL,
  result TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

-- System events (errors, warnings, health)
CREATE TABLE IF NOT EXISTS system_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  source TEXT,
  message TEXT NOT NULL,
  details TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Productivity / chat context
CREATE TABLE IF NOT EXISTS chat_context (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_date TEXT NOT NULL DEFAULT (date('now')),
  topic TEXT,
  summary TEXT,
  decisions_made TEXT,
  objectives_completed INTEGER DEFAULT 0,
  code_files_changed INTEGER DEFAULT 0,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_pipeline_status ON pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_name ON agent_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_timestamp ON agent_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_decisions_type ON decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_campaign_product ON campaign_events(product);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_system_severity ON system_events(severity);
