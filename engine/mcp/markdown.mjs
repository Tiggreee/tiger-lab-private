#!/usr/bin/env node
/**
 * MCP Connector: Markdown MCP
 * Command: npx mcp-markdown-server
 * Category: docs
 * Generate docs, specs, reports in MD. Product Architect writes real specs.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = 'mcp-markdown-server'.split(', ').filter(Boolean);

console.log('🔌 Starting Markdown MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('Markdown MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
