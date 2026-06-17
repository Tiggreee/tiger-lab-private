#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const REGISTRY_PATH = resolve('ops/mcp/external-registry.json');
const MEMORY_PATH = resolve('ops/runtime/mcp-memory.json');
const CONNECTOR_STATE = resolve('ops/runtime/mcp-connector-state.json');

function loadRegistry() {
  try { return JSON.parse(readFileSync(REGISTRY_PATH, 'utf8')); } catch { return { servers: [] }; }
}

function loadMemory() {
  try { return JSON.parse(readFileSync(MEMORY_PATH, 'utf8')); } catch { return {}; }
}

function saveMemory(mem) {
  mkdirSync(resolve('ops/runtime'), { recursive: true });
  writeFileSync(MEMORY_PATH, JSON.stringify(mem, null, 2), 'utf8');
}

function loadConnectorState() {
  try { return JSON.parse(readFileSync(CONNECTOR_STATE, 'utf8')); } catch { return { enabled: [], calls: [], errors: [] }; }
}

function saveConnectorState(state) {
  mkdirSync(resolve('ops/runtime'), { recursive: true });
  writeFileSync(CONNECTOR_STATE, JSON.stringify(state, null, 2), 'utf8');
}

export function enable(serverId) {
  const state = loadConnectorState();
  if (!state.enabled.includes(serverId)) {
    state.enabled.push(serverId);
  }
  saveConnectorState(state);
  return { enabled: true, serverId, totalEnabled: state.enabled.length };
}

export function disable(serverId) {
  const state = loadConnectorState();
  state.enabled = state.enabled.filter(s => s !== serverId);
  saveConnectorState(state);
  return { disabled: true, serverId, totalEnabled: state.enabled.length };
}

export function isEnabled(serverId) {
  const state = loadConnectorState();
  return state.enabled.includes(serverId);
}

export function listEnabled() {
  const state = loadConnectorState();
  const registry = loadRegistry();
  return state.enabled.map(id => {
    const server = registry.servers?.find(s => s.id === id);
    return { id, name: server?.name || id, package: server?.package || 'unknown' };
  });
}

export function memorySave({ key, value } = {}) {
  const mem = loadMemory();
  mem[key] = { value, timestamp: new Date().toISOString() };
  saveMemory(mem);
  logCall('memory', 'save', key);
  return { saved: true, key };
}

export function memoryLoad({ key } = {}) {
  const mem = loadMemory();
  const result = mem[key] || null;
  logCall('memory', 'load', key);
  return result;
}

export function memoryList() {
  const mem = loadMemory();
  logCall('memory', 'list', '');
  return mem;
}

export function memoryDelete({ key } = {}) {
  const mem = loadMemory();
  delete mem[key];
  saveMemory(mem);
  logCall('memory', 'delete', key);
  return { deleted: true, key };
}

export function filesystemRead({ filePath } = {}) {
  if (!filePath) return { error: 'filePath is required' };
  const allowed = ['ops/', 'engine/', 'scripts/', 'agents/', 'docs/', 'shared/'];
  const isAllowed = allowed.some(prefix => filePath.startsWith(prefix));
  if (!isAllowed) {
    logError('filesystem', `Blocked read outside sandbox: ${filePath}`);
    return { error: 'Path outside sandbox', path: filePath };
  }
  try {
    const content = readFileSync(resolve(filePath), 'utf8');
    logCall('filesystem', 'read', filePath);
    return { content: content.substring(0, 5000), path: filePath, size: content.length };
  } catch (e) {
    logError('filesystem', `Read failed: ${filePath} — ${e.message}`);
    return { error: e.message, path: filePath };
  }
}

export function filesystemWrite({ filePath, content } = {}) {
  if (!filePath || !content) return { error: 'filePath and content are required' };
  const allowed = ['ops/', 'engine/', 'scripts/', 'agents/', 'docs/', 'shared/'];
  const isAllowed = allowed.some(prefix => filePath.startsWith(prefix));
  if (!isAllowed) {
    logError('filesystem', `Blocked write outside sandbox: ${filePath}`);
    return { error: 'Path outside sandbox', path: filePath };
  }
  try {
    mkdirSync(resolve(filePath).replace(/[/\\][^/\\]+$/, ''), { recursive: true });
    writeFileSync(resolve(filePath), content, 'utf8');
    logCall('filesystem', 'write', filePath);
    return { written: true, path: filePath, size: content.length };
  } catch (e) {
    logError('filesystem', `Write failed: ${filePath} — ${e.message}`);
    return { error: e.message, path: filePath };
  }
}

export function sqliteQuery({ sql, params } = {}) {
  if (!sql) return { error: 'sql is required' };
  logCall('sqlite', 'query', sql.substring(0, 100));
  return { sql, params: params || [], note: 'Use event-logger.mjs query() for actual execution' };
}

function logCall(serverId, action, detail) {
  const state = loadConnectorState();
  state.calls.push({ serverId, action, detail, timestamp: new Date().toISOString() });
  if (state.calls.length > 500) state.calls = state.calls.slice(-500);
  saveConnectorState(state);
}

function logError(serverId, message) {
  const state = loadConnectorState();
  state.errors.push({ serverId, message, timestamp: new Date().toISOString() });
  if (state.errors.length > 100) state.errors = state.errors.slice(-100);
  saveConnectorState(state);
}

export function callTool(serverId, toolName, args = {}) {
  if (!isEnabled(serverId)) {
    return { error: `Server ${serverId} is not enabled. Use enable() first.` };
  }

  const tools = {
    memory: { save: memorySave, load: memoryLoad, list: memoryList, delete: memoryDelete },
    filesystem: { read: filesystemRead, write: filesystemWrite },
    sqlite: { query: sqliteQuery }
  };

  const serverTools = tools[serverId];
  if (!serverTools) return { error: `Unknown server: ${serverId}` };

  const tool = serverTools[toolName];
  if (!tool) return { error: `Unknown tool: ${toolName} on ${serverId}` };

  try {
    return tool(args);
  } catch (e) {
    logError(serverId, `Tool call failed: ${toolName} — ${e.message}`);
    return { error: e.message };
  }
}

export function connectorStats() {
  const state = loadConnectorState();
  return {
    enabled: state.enabled,
    totalCalls: state.calls.length,
    totalErrors: state.errors.length,
    recentCalls: state.calls.slice(-10),
    recentErrors: state.errors.slice(-5)
  };
}

const args = process.argv.slice(2);

if (args.includes('--enable')) {
  console.log(JSON.stringify(enable(args[args.indexOf('--enable') + 1]), null, 2));
} else if (args.includes('--disable')) {
  console.log(JSON.stringify(disable(args[args.indexOf('--disable') + 1]), null, 2));
} else if (args.includes('--list')) {
  console.log(JSON.stringify(listEnabled(), null, 2));
} else if (args.includes('--call')) {
  const idx = args.indexOf('--call');
  const serverId = args[idx + 1];
  const toolName = args[idx + 2];
  const toolArgs = args[idx + 3] ? JSON.parse(args[idx + 3]) : {};
  console.log(JSON.stringify(callTool(serverId, toolName, toolArgs), null, 2));
} else if (args.includes('--stats')) {
  console.log(JSON.stringify(connectorStats(), null, 2));
} else {
  console.log('MCP Connector — tool integration layer for agents');
  console.log('  --enable <server>              Enable a server');
  console.log('  --disable <server>             Disable a server');
  console.log('  --list                         List enabled servers');
  console.log('  --call <server> <tool> [json]  Call a tool');
  console.log('  --stats                        Show connector statistics');
  console.log('\nAvailable servers: memory, filesystem, sqlite');
}
