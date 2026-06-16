#!/usr/bin/env node
/**
 * MCP Connector: Image MCP
 * Command: npx mcp-image-server
 * Category: utility
 * Local image processing. Resize for social media without API.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = 'mcp-image-server'.split(', ').filter(Boolean);

console.log('🔌 Starting Image MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('Image MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
