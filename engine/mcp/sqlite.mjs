#!/usr/bin/env node
/**
 * MCP Connector: SQLite MCP
 * Command: npx @modelcontextprotocol/server-sqlite
 * Category: data
 * Direct DB queries. Dashboard reads leads.db live.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = '@modelcontextprotocol/server-sqlite'.split(', ').filter(Boolean);

console.log('🔌 Starting SQLite MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('SQLite MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
