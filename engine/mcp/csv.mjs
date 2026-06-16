#!/usr/bin/env node
/**
 * MCP Connector: CSV MCP
 * Command: npx mcp-csv-server
 * Category: data
 * Process CSV exports. Pipeline reads/writes leads seamlessly.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = 'mcp-csv-server'.split(', ').filter(Boolean);

console.log('🔌 Starting CSV MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('CSV MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
