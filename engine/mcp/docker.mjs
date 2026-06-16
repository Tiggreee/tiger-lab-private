#!/usr/bin/env node
/**
 * MCP Connector: Docker MCP
 * Command: npx mcp-docker-server
 * Category: automation
 * Container management. Scale engine across environments.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = 'mcp-docker-server'.split(', ').filter(Boolean);

console.log('🔌 Starting Docker MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('Docker MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
