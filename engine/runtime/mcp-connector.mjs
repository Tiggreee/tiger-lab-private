#!/usr/bin/env node
/**
 * MCP Connector — engine/runtime/mcp-connector.mjs
 * Connects TigerLab to external MCP servers via npx.
 * Each server is a subprocess. Toggle from dashboard.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const REGISTRY = resolve('ops/mcp/external-registry.json');
const ACTIVITY = resolve('ops/runtime/mcp-activity.json');
const CONNECTORS_DIR = resolve('engine/mcp');

// Generate connector scripts per MCP server
function generateConnectors() {
  const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
  mkdirSync(CONNECTORS_DIR, { recursive: true });
  
  let generated = 0;
  for (const [id, server] of Object.entries(registry.servers)) {
    if (!server.enabled) continue;
    
    const connector = `#!/usr/bin/env node
/**
 * MCP Connector: ${server.name}
 * Command: ${server.command}
 * Category: ${server.category}
 * ${server.description}
 */
import { spawn } from 'node:child_process';

const cmd = '${server.command.split(' ')[0]}';
const args = '${server.command.split(' ').slice(1).join("', '")}'.split(', ').filter(Boolean);

console.log('🔌 Starting ${server.name}...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('${server.name} exited with code', code);
});

process.on('SIGINT', () => proc.kill());
`;
    
    writeFileSync(resolve(CONNECTORS_DIR, `${id}.mjs`), connector, 'utf8');
    generated++;
  }
  
  return generated;
}

// Track connections
function connect(id) {
  const activity = JSON.parse(readFileSync(ACTIVITY, 'utf8'));
  if (!activity.tracked[id]) {
    activity.tracked[id] = { uses: 0, enabled: true, lastUsed: null, firstSeen: new Date().toISOString() };
  }
  activity.tracked[id].enabled = true;
  activity.tracked[id].uses++;
  activity.tracked[id].lastUsed = new Date().toISOString();
  
  activity.history = activity.history || [];
  activity.history.push({ time: new Date().toISOString(), server: id, action: 'connect' });
  
  writeFileSync(ACTIVITY, JSON.stringify(activity, null, 2), 'utf8');
  return activity;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--generate')) {
    const count = generateConnectors();
    console.log(`✅ Generated ${count} MCP connectors in engine/mcp/`);
  } else if (args.includes('--connect')) {
    const id = args[args.indexOf('--connect') + 1];
    connect(id);
    console.log(`🔌 Connected: ${id}`);
  } else {
    const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
    const enabled = Object.values(registry.servers).filter(s => s.enabled).length;
    console.log(`MCP Connector: ${enabled} servers ready`);
    console.log(`Generate connectors: --generate`);
    console.log(`Connect to server: --connect <id>`);
  }
}

main();
