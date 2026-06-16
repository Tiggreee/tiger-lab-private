#!/usr/bin/env node
/**
 * MCP Connector: PDF MCP
 * Command: npx mcp-pdf-server
 * Category: docs
 * Generate PDF proposals from campaigns. Professional client docs.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = 'mcp-pdf-server'.split(', ').filter(Boolean);

console.log('🔌 Starting PDF MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('PDF MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
