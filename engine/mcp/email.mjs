#!/usr/bin/env node
/**
 * MCP Connector: Email SMTP MCP
 * Command: npx mcp-email-server
 * Category: comm
 * Send real campaign emails. No more dead templates.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = 'mcp-email-server'.split(', ').filter(Boolean);

console.log('🔌 Starting Email SMTP MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('Email SMTP MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
