#!/usr/bin/env node
/**
 * MCP Connector: Fetch MCP
 * Command: npx @modelcontextprotocol/server-fetch
 * Category: research
 * Web content fetching. R&D Engine researches with live data.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = '@modelcontextprotocol/server-fetch'.split(', ').filter(Boolean);

console.log('🔌 Starting Fetch MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('Fetch MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
