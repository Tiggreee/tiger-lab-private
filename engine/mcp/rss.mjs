#!/usr/bin/env node
/**
 * MCP Connector: RSS MCP
 * Command: npx mcp-rss-server
 * Category: research
 * RSS feed reader. Monitor competitors, industry news.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = 'mcp-rss-server'.split(', ').filter(Boolean);

console.log('🔌 Starting RSS MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('RSS MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
