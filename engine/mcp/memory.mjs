#!/usr/bin/env node
/**
 * MCP Connector: Memory MCP
 * Command: npx @modelcontextprotocol/server-memory
 * Category: brain
 * Persistent memory between sessions. Creative Agent remembers past campaigns.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = '@modelcontextprotocol/server-memory'.split(', ').filter(Boolean);

console.log('🔌 Starting Memory MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('Memory MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
