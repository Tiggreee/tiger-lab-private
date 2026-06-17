#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const DB_PATH = resolve('ops/database/durable-memory.db');
const JSON_FALLBACK = resolve('ops/runtime/durable-memory.json');

let _db = null;

async function getDB() {
  if (_db) return _db;
  try {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const buffer = existsSync(DB_PATH) ? readFileSync(DB_PATH) : null;
    _db = new SQL.Database(buffer);
    _db.run('PRAGMA journal_mode=WAL');
    _db.run(`CREATE TABLE IF NOT EXISTS agent_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_name TEXT NOT NULL,
      task_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      payload TEXT,
      result TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    _db.run(`CREATE TABLE IF NOT EXISTS agent_context (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_name TEXT NOT NULL,
      context_key TEXT NOT NULL,
      context_value TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(agent_name, context_key)
    )`);
    _db.run(`CREATE TABLE IF NOT EXISTS shared_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memory_key TEXT UNIQUE NOT NULL,
      memory_value TEXT,
      owner TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    _db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_agent ON agent_tasks(agent_name)`);
    _db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON agent_tasks(status)`);
    _db.run(`CREATE INDEX IF NOT EXISTS idx_context_agent ON agent_context(agent_name)`);
    saveDB();
    return _db;
  } catch {
    return null;
  }
}

function saveDB() {
  if (!_db) return;
  const data = _db.export();
  mkdirSync(resolve('ops/database'), { recursive: true });
  writeFileSync(DB_PATH, Buffer.from(data));
}

function loadFallback() {
  try { return JSON.parse(readFileSync(JSON_FALLBACK, 'utf8')); } catch { return { tasks: [], context: {}, shared: {} }; }
}

function saveFallback(data) {
  mkdirSync(resolve('ops/runtime'), { recursive: true });
  writeFileSync(JSON_FALLBACK, JSON.stringify(data, null, 2), 'utf8');
}

export async function saveTask(agentName, taskId, status, payload = {}, result = null) {
  const db = await getDB();
  if (db) {
    const existing = db.exec('SELECT id FROM agent_tasks WHERE agent_name=? AND task_id=?', [agentName, taskId]);
    if (existing.length && existing[0].values.length) {
      db.run('UPDATE agent_tasks SET status=?, payload=?, result=?, updated_at=datetime(\'now\') WHERE agent_name=? AND task_id=?',
        [status, JSON.stringify(payload), result ? JSON.stringify(result) : null, agentName, taskId]);
    } else {
      db.run('INSERT INTO agent_tasks (agent_name, task_id, status, payload, result) VALUES (?, ?, ?, ?, ?)',
        [agentName, taskId, status, JSON.stringify(payload), result ? JSON.stringify(result) : null]);
    }
    saveDB();
    return { saved: true, agentName, taskId, status };
  }
  const fb = loadFallback();
  fb.tasks.push({ agentName, taskId, status, payload, result, timestamp: new Date().toISOString() });
  saveFallback(fb);
  return { saved: true, agentName, taskId, status, fallback: true };
}

export async function getTasks(agentName, status) {
  const db = await getDB();
  if (db) {
    let sql = 'SELECT * FROM agent_tasks WHERE 1=1';
    const params = [];
    if (agentName) { sql += ' AND agent_name=?'; params.push(agentName); }
    if (status) { sql += ' AND status=?'; params.push(status); }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const result = db.exec(sql, params);
    if (!result.length) return [];
    return result[0].values.map(row => {
      const obj = {};
      result[0].columns.forEach((col, i) => {
        obj[col] = col === 'payload' || col === 'result' ? (row[i] ? JSON.parse(row[i]) : null) : row[i];
      });
      return obj;
    });
  }
  const fb = loadFallback();
  return fb.tasks.filter(t => (!agentName || t.agentName === agentName) && (!status || t.status === status));
}

export async function saveContext(agentName, key, value) {
  const db = await getDB();
  if (db) {
    db.run('INSERT OR REPLACE INTO agent_context (agent_name, context_key, context_value, created_at) VALUES (?, ?, ?, datetime(\'now\'))',
      [agentName, key, typeof value === 'string' ? value : JSON.stringify(value)]);
    saveDB();
    return { saved: true, agentName, key };
  }
  const fb = loadFallback();
  if (!fb.context[agentName]) fb.context[agentName] = {};
  fb.context[agentName][key] = value;
  saveFallback(fb);
  return { saved: true, agentName, key, fallback: true };
}

export async function getContext(agentName, key) {
  const db = await getDB();
  if (db) {
    const result = db.exec('SELECT context_value FROM agent_context WHERE agent_name=? AND context_key=?', [agentName, key]);
    if (result.length && result[0].values.length) {
      const val = result[0].values[0][0];
      try { return JSON.parse(val); } catch { return val; }
    }
    return null;
  }
  const fb = loadFallback();
  return fb.context[agentName]?.[key] || null;
}

export async function saveShared(key, value, owner = 'system') {
  const db = await getDB();
  if (db) {
    db.run('INSERT OR REPLACE INTO shared_memory (memory_key, memory_value, owner, updated_at) VALUES (?, ?, ?, datetime(\'now\'))',
      [key, typeof value === 'string' ? value : JSON.stringify(value), owner]);
    saveDB();
    return { saved: true, key, owner };
  }
  const fb = loadFallback();
  fb.shared[key] = { value, owner, timestamp: new Date().toISOString() };
  saveFallback(fb);
  return { saved: true, key, owner, fallback: true };
}

export async function getShared(key) {
  const db = await getDB();
  if (db) {
    const result = db.exec('SELECT memory_value, owner FROM shared_memory WHERE memory_key=?', [key]);
    if (result.length && result[0].values.length) {
      const val = result[0].values[0][0];
      try { return { value: JSON.parse(val), owner: result[0].values[0][1] }; } catch { return { value: val, owner: result[0].values[0][1] }; }
    }
    return null;
  }
  const fb = loadFallback();
  return fb.shared[key] || null;
}

export async function listShared() {
  const db = await getDB();
  if (db) {
    const result = db.exec('SELECT memory_key, owner, updated_at FROM shared_memory ORDER BY updated_at DESC LIMIT 50');
    if (!result.length) return [];
    return result[0].values.map(row => ({ key: row[0], owner: row[1], updatedAt: row[2] }));
  }
  const fb = loadFallback();
  return Object.entries(fb.shared).map(([k, v]) => ({ key: k, owner: v.owner, updatedAt: v.timestamp }));
}

export async function memoryStats() {
  const db = await getDB();
  if (db) {
    const tables = ['agent_tasks', 'agent_context', 'shared_memory'];
    const counts = {};
    for (const t of tables) {
      const r = db.exec(`SELECT COUNT(*) FROM ${t}`);
      counts[t] = r[0]?.values?.[0]?.[0] || 0;
    }
    return counts;
  }
  const fb = loadFallback();
  return { agent_tasks: fb.tasks.length, agent_context: Object.keys(fb.context).length, shared_memory: Object.keys(fb.shared).length, fallback: true };
}

const args = process.argv.slice(2);

if (args.includes('--save-task')) {
  const idx = args.indexOf('--save-task');
  saveTask(args[idx+1], args[idx+2], args[idx+3] || 'pending').then(r => console.log(JSON.stringify(r, null, 2)));
} else if (args.includes('--get-tasks')) {
  const agent = args[args.indexOf('--get-tasks') + 1];
  getTasks(agent === '--' ? null : agent).then(r => console.log(JSON.stringify(r, null, 2)));
} else if (args.includes('--save-context')) {
  const idx = args.indexOf('--save-context');
  saveContext(args[idx+1], args[idx+2], args[idx+3]).then(r => console.log(JSON.stringify(r, null, 2)));
} else if (args.includes('--get-context')) {
  const idx = args.indexOf('--get-context');
  getContext(args[idx+1], args[idx+2]).then(r => console.log(JSON.stringify(r, null, 2)));
} else if (args.includes('--save-shared')) {
  const idx = args.indexOf('--save-shared');
  saveShared(args[idx+1], args[idx+2], args[idx+3] || 'system').then(r => console.log(JSON.stringify(r, null, 2)));
} else if (args.includes('--get-shared')) {
  const key = args[args.indexOf('--get-shared') + 1];
  getShared(key).then(r => console.log(JSON.stringify(r, null, 2)));
} else if (args.includes('--list-shared')) {
  listShared().then(r => console.log(JSON.stringify(r, null, 2)));
} else if (args.includes('--stats')) {
  memoryStats().then(r => console.log(JSON.stringify(r, null, 2)));
} else {
  console.log('Durable Memory — shared state layer for agents');
  console.log('  --save-task <agent> <taskId> [status]   Save task state');
  console.log('  --get-tasks [agent]                     Get tasks for agent');
  console.log('  --save-context <agent> <key> <value>    Save agent context');
  console.log('  --get-context <agent> <key>             Get agent context');
  console.log('  --save-shared <key> <value> [owner]     Save shared memory');
  console.log('  --get-shared <key>                      Get shared memory');
  console.log('  --list-shared                           List all shared memory');
  console.log('  --stats                                 Show memory statistics');
}
