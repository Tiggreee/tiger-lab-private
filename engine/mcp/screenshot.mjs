#!/usr/bin/env node
/**
 * MCP Connector: Screenshot MCP
 * Command: npx mcp-screenshot-server
 * Category: docs
 * Capture landing previews. Quality Verifier sees campaign output.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = 'mcp-screenshot-server'.split(', ').filter(Boolean);

console.log('🔌 Starting Screenshot MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('Screenshot MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
