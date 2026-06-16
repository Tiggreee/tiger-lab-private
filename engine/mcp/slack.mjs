#!/usr/bin/env node
/**
 * MCP Connector: Slack MCP
 * Command: npx @modelcontextprotocol/server-slack
 * Category: comm
 * Slack notifications. Pipeline alerts, payment confirmations.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = '@modelcontextprotocol/server-slack'.split(', ').filter(Boolean);

console.log('🔌 Starting Slack MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('Slack MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
