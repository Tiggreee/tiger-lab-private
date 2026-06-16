#!/usr/bin/env node
/**
 * MCP Connector: Git MCP
 * Command: uvx mcp-server-git
 * Category: code
 * Local git operations. Branch, diff, log from agents.
 */
import { spawn } from 'node:child_process';

const cmd = 'uvx';
const args = 'mcp-server-git'.split(', ').filter(Boolean);

console.log('🔌 Starting Git MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('Git MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
