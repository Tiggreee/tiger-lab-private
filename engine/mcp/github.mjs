#!/usr/bin/env node
/**
 * MCP Connector: GitHub MCP
 * Command: npx @github/mcp-server
 * Category: code
 * Full repo control. Auto-PRs, commits, issues from agents.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = '@github/mcp-server'.split(', ').filter(Boolean);

console.log('🔌 Starting GitHub MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('GitHub MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
