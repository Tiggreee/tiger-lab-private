#!/usr/bin/env node
/**
 * MCP Connector: Sequential Thinking MCP
 * Command: npx @modelcontextprotocol/server-sequential-thinking
 * Category: brain
 * Step-by-step reasoning. Better decisions from the engine.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = '@modelcontextprotocol/server-sequential-thinking'.split(', ').filter(Boolean);

console.log('🔌 Starting Sequential Thinking MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('Sequential Thinking MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
