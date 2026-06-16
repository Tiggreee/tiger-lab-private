#!/usr/bin/env node
/**
 * MCP Connector: Puppeteer MCP
 * Command: npx @modelcontextprotocol/server-puppeteer
 * Category: research
 * Headless browser. Scrape leads, screenshot campaigns.
 */
import { spawn } from 'node:child_process';

const cmd = 'npx';
const args = '@modelcontextprotocol/server-puppeteer'.split(', ').filter(Boolean);

console.log('🔌 Starting Puppeteer MCP...');
const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('close', code => {
  console.log('Puppeteer MCP exited with code', code);
});

process.on('SIGINT', () => proc.kill());
