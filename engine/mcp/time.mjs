#!/usr/bin/env node
/**
 * MCP Connector: Time MCP
 * Command: npx @modelcontextprotocol/server-time
 * Category: automation
 * Timezone handling. Pipeline respects MX/US/EU schedules.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = '@modelcontextprotocol/server-time'.split(', ').filter(Boolean);

console.log('🔌 Starting Time MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('Time MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
