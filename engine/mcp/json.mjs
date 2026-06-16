#!/usr/bin/env node
/**
 * MCP Connector: JSON MCP
 * Command: npx mcp-json-server
 * Category: utility
 * Validate/transform JSON. TigerLab MCP tools self-validate.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = 'mcp-json-server'.split(', ').filter(Boolean);

console.log('🔌 Starting JSON MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('JSON MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
