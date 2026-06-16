#!/usr/bin/env node
/**
 * MCP Connector: Filesystem MCP
 * Command: npx @modelcontextprotocol/server-filesystem
 * Category: code
 * Secure file access. Agents read/write code safely.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = '@modelcontextprotocol/server-filesystem'.split(', ').filter(Boolean);

console.log('🔌 Starting Filesystem MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('Filesystem MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
