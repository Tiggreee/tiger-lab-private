#!/usr/bin/env node
/**
 * Event Logger — engine/runtime/event-logger.mjs
 * Unified SQL logging for ALL engine activity.
 * Pipeline, agents, decisions, campaigns, revenue, MCP, system events.
 * Query everything with SQL. Oracle-compatible.
 */

import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const DB_PATH = resolve('ops/database/events.db');
const SCHEMA_PATH = resolve('ops/database/events-schema.sql');
const RUNTIME_DIR = resolve('ops/runtime');

let _db = null;

async function getDB() {
  if (_db) return _db;
  const SQL = await initSqlJs();
  const buffer = existsSync(DB_PATH) ? readFileSync(DB_PATH) : null;
  _db = new SQL.Database(buffer);
  _db.run('PRAGMA journal_mode=WAL');
  _db.run('PRAGMA foreign_keys=ON');
  return _db;
}

function saveDB() {
  if (!_db) return;
  const data = _db.export();
  const buffer = Buffer.from(data);
  mkdirSync(resolve('ops/database'), { recursive: true });
  writeFileSync(DB_PATH, buffer);
  _db.close();
  _db = null;
}

async function initSchema() {
  const db = await getDB();
  const schema = readFileSync(SCHEMA_PATH, 'utf8');
  
  // Split by semicolons, but preserve CREATE TABLE blocks
  const statements = schema
    .replace(/--.*$/gm, '')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 10);
  
  for (const stmt of statements) {
    try { 
      db.run(stmt); 
    } catch (e) {
      if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
        console.error('Schema error:', e.message.substring(0, 80));
      }
    }
  }
  saveDB();
}

// === PUBLIC API ===

export async function logPipeline(runId, status, data = {}) {
  const db = await getDB();
  const existing = db.exec('SELECT id FROM pipeline_runs WHERE run_id = ?', [runId]);
  if (existing.length && existing[0].values.length) {
    db.run('UPDATE pipeline_runs SET status=?, ended_at=datetime(\'now\'), steps_passed=?, steps_failed=?, duration_seconds=? WHERE run_id=?',
      [status, data.passed || 0, data.failed || 0, data.duration || 0, runId]);
  } else {
    db.run('INSERT INTO pipeline_runs (run_id, status, steps_total) VALUES (?, ?, ?)',
      [runId, status, data.total || 0]);
  }
  saveDB();
}

export async function logAgent(agentName, action, status = 'ok', details = '', runId = '') {
  const db = await getDB();
  db.run('INSERT INTO agent_logs (agent_name, action, status, details, run_id) VALUES (?, ?, ?, ?, ?)',
    [agentName, action, status, details?.substring(0, 500) || '', runId]);
  saveDB();
}

export async function logDecision(type, subject, action, reason = '', score = null) {
  const db = await getDB();
  db.run('INSERT INTO decisions (decision_type, subject, action, reason, score) VALUES (?, ?, ?, ?, ?)',
    [type, subject, action, reason, score]);
  saveDB();
}

export async function logCampaign(campaignId, product, eventType, channel = '', status = '', score = null) {
  const db = await getDB();
  db.run('INSERT INTO campaign_events (campaign_id, product, event_type, channel, status, score) VALUES (?, ?, ?, ?, ?, ?)',
    [campaignId, product, eventType, channel, status, score]);
  saveDB();
}

export async function logTransaction(paymentId, product, amount, currency = 'USD', provider = '', status = 'pending') {
  const db = await getDB();
  db.run('INSERT INTO transactions (payment_id, product, amount, currency, provider, status) VALUES (?, ?, ?, ?, ?, ?)',
    [paymentId, product, amount, currency, provider, status]);
  saveDB();
}

export async function logMCP(serverId, action, result = '') {
  const db = await getDB();
  db.run('INSERT INTO mcp_events (server_id, action, result) VALUES (?, ?, ?)',
    [serverId, action, result]);
  saveDB();
}

export async function logSystem(type, severity, source, message, details = '') {
  const db = await getDB();
  db.run('INSERT INTO system_events (event_type, severity, source, message, details) VALUES (?, ?, ?, ?, ?)',
    [type, severity, source, message, details?.substring(0, 500) || '']);
  saveDB();
}

export async function logChat(topic, summary, decisions = '', objectives = 0, files = 0) {
  const db = await getDB();
  db.run('INSERT INTO chat_context (topic, summary, decisions_made, objectives_completed, code_files_changed) VALUES (?, ?, ?, ?, ?)',
    [topic, summary, decisions, objectives, files]);
  saveDB();
}

// Query helpers
export async function query(sql, params = []) {
  const db = await getDB();
  try {
    const result = db.exec(sql, params);
    if (!result.length) return [];
    return result[0].values.map(row => {
      const obj = {};
      result[0].columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
  } catch (e) {
    return [];
  }
}

export async function stats() {
  const db = await getDB();
  const tables = ['pipeline_runs', 'agent_logs', 'decisions', 'campaign_events', 'transactions', 'mcp_events', 'system_events', 'chat_context'];
  const counts = {};
  for (const t of tables) {
    try {
      const r = db.exec(`SELECT COUNT(*) FROM ${t}`);
      counts[t] = r[0]?.values?.[0]?.[0] || 0;
    } catch { counts[t] = 0; }
  }
  return counts;
}

// Backfill from existing JSON files
async function backfill() {
  const db = await getDB();
  let total = 0;
  
  // Backfill pipeline runs from startup log
  try {
    const startup = JSON.parse(readFileSync(join(RUNTIME_DIR, 'engine-startup-log.json'), 'utf8'));
    if (startup.startedAt) {
      const runId = 'backfill-' + startup.startedAt;
      db.run('INSERT OR IGNORE INTO pipeline_runs (run_id, started_at, ended_at, status, duration_seconds) VALUES (?, ?, ?, ?, ?)',
        [runId, startup.startedAt, startup.endedAt, 'completed', startup.duration || 0]);
      total++;
    }
  } catch {}

  // Backfill decisions
  try {
    const decisions = JSON.parse(readFileSync(join(RUNTIME_DIR, 'engine-decisions.json'), 'utf8'));
    (decisions.decisions || []).forEach(d => {
      db.run('INSERT INTO decisions (decision_type, subject, action, reason, timestamp) VALUES (?, ?, ?, ?, ?)',
        [d.type || 'engine', d.agent || 'unknown', d.action || 'unknown', d.reason || '', d.time]);
      total++;
    });
  } catch {}

  // Backfill MCP memory as events
  try {
    const mem = JSON.parse(readFileSync(join(RUNTIME_DIR, 'mcp-memory.json'), 'utf8'));
    Object.entries(mem).forEach(([key, val]) => {
      db.run('INSERT INTO mcp_events (server_id, action, result, timestamp) VALUES (?, ?, ?, ?)',
        ['memory', 'save', `${key}: ${val.value}`, val.timestamp]);
      total++;
    });
  } catch {}

  // Backfill campaigns
  try {
    const campDir = resolve('ops/runtime/campaigns');
    if (existsSync(campDir)) {
      const dirs = readdirSync(campDir).filter(d => {
        try { return statSync(join(campDir, d)).isDirectory(); } catch { return false; }
      });
      for (const dir of dirs) {
        try {
          const camp = JSON.parse(readFileSync(join(campDir, dir, 'campaign.json'), 'utf8'));
          db.run('INSERT OR IGNORE INTO campaign_events (campaign_id, product, event_type, status, score) VALUES (?, ?, ?, ?, ?)',
            [dir, camp.product || 'unknown', 'created', camp.status || 'draft', camp.score || 0]);
          total++;
        } catch {}
      }
    }
  } catch {}

  // Backfill production report as system event
  try {
    const report = JSON.parse(readFileSync(join(RUNTIME_DIR, 'production-report.json'), 'utf8'));
    db.run('INSERT INTO system_events (event_type, severity, source, message, details) VALUES (?, ?, ?, ?, ?)',
      ['production_report', 'info', 'engine', `Grade: ${report.overallGrade} (${report.comparativeScore}/100)`, `Revenue prob: ${report.revenueProbability}`]);
    total++;
  } catch {}

  // Backfill chat context
  try {
    const core = JSON.parse(readFileSync(join(RUNTIME_DIR, 'core-objectives.json'), 'utf8'));
    db.run('INSERT INTO chat_context (topic, summary, decisions_made, objectives_completed) VALUES (?, ?, ?, ?)',
      ['Core Objectives', `Version ${core.version}, ${core.objectives?.length || 0} objectives`, core.rules?.join('; ') || '', core.objectives?.filter(o => o.status === 'done')?.length || 0]);
    total++;
  } catch {}

  saveDB();
  return total;
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  await initSchema();
  
  if (args.includes('--backfill')) {
    const count = await backfill();
    console.log(`✅ Backfilled ${count} events from existing data`);
    _db = null; // Reset cache for stats
  }
  
  if (args.includes('--stats')) {
    const db = await getDB();
    const s = await stats();
    console.log('=== EVENT DATABASE STATS ===');
    Object.entries(s).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    const total = Object.values(s).reduce((a, b) => a + b, 0);
    console.log(`  TOTAL EVENTS: ${total}`);
  }
  
  // Log this session
  await logSystem('engine_start', 'info', 'event-logger', 'Event logger initialized');
  await logChat('Event Logger Setup', 'Unified SQL event logging for all engine activity', 'Build event-logger.mjs + backfill', 1, 2);
  
  console.log('Event Logger ready.');
  _db = null;
}

main().catch(console.error);
