#!/usr/bin/env node
/**
 * MCP Connector: Cron MCP
 * Command: npx mcp-cron-server
 * Category: automation
 * Task scheduling. Auto-backups, reports, maintenance.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = 'mcp-cron-server'.split(', ').filter(Boolean);

console.log('🔌 Starting Cron MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('Cron MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
