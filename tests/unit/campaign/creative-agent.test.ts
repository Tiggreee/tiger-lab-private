/**
 * Unit tests: Creative Agent campaign pipeline
 * Validates copy generation, format compliance, output structure
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const CAMPAIGNS_DIR = resolve('ops/runtime/campaigns');

function runCreativeAgent(args: string): string {
  return execSync(`node engine/campaigns/creative-agent.mjs ${args}`, {
    encoding: 'utf8',
    env: { ...process.env }
  });
}

function getLatestCampaignDir(): string | null {
  if (!existsSync(CAMPAIGNS_DIR)) return null;
  const dirs = readdirSync(CAMPAIGNS_DIR)
    .filter(d => d.startsWith('CAMP-'))
    .sort()
    .reverse();
  return dirs.length > 0 ? resolve(CAMPAIGNS_DIR, dirs[0]) : null;
}

describe('Creative Agent — Copy Generation', () => {
  it('X copy must be ≤ 280 chars (never truncated with ...)', () => {
    runCreativeAgent('--create --product "Docflow API" --segment contabilidad');
    const dir = getLatestCampaignDir();
    expect(dir).not.toBeNull();

    const xFile = resolve(dir!, 'x.txt');
    expect(existsSync(xFile)).toBe(true);

    const xContent = readFileSync(xFile, 'utf8');
    expect(xContent.length).toBeLessThanOrEqual(280);
    expect(xContent.endsWith('...')).toBe(false);
  });

  it('Email copy must contain valid HTML structure', () => {
    runCreativeAgent('--create --product "Docflow API" --segment contabilidad');
    const dir = getLatestCampaignDir();
    const emailFile = resolve(dir!, 'email.html');
    expect(existsSync(emailFile)).toBe(true);

    const html = readFileSync(emailFile, 'utf8');
    expect(html).toContain('<div');
    expect(html).toContain('<h1');
    expect(html).toContain('<a ');
    expect(html).toContain('href=');
    expect(html).not.toBe('');
  });

  it('LinkedIn copy must be ≥ 100 chars', () => {
    runCreativeAgent('--create --product "Docflow API" --segment contabilidad');
    const dir = getLatestCampaignDir();
    const li = readFileSync(resolve(dir!, 'linkedin.txt'), 'utf8');
    expect(li.length).toBeGreaterThanOrEqual(100);
  });

  it('Telegram/Discord must contain full body text — no substring truncation', () => {
    runCreativeAgent('--create --product "Docflow API" --segment contabilidad');
    const dir = getLatestCampaignDir();

    const telegram = readFileSync(resolve(dir!, 'telegram.md'), 'utf8');
    const discord  = readFileSync(resolve(dir!, 'discord.md'), 'utf8');

    expect(telegram.endsWith('...')).toBe(false);
    expect(discord.endsWith('...')).toBe(false);
    expect(telegram.length).toBeGreaterThan(100);
    expect(discord.length).toBeGreaterThan(100);
  });
});

describe('Creative Agent — Output Structure', () => {
  it('generates exactly 6 channel files', () => {
    runCreativeAgent('--create --product "Docflow API" --segment contabilidad');
    const dir = getLatestCampaignDir();
    expect(dir).not.toBeNull();

    const expected = ['email.html', 'linkedin.txt', 'x.txt', 'facebook.txt', 'telegram.md', 'discord.md'];
    for (const file of expected) {
      expect(existsSync(resolve(dir!, file))).toBe(true);
    }
  });

  it('generates campaign.json with required fields', () => {
    runCreativeAgent('--create --product "Docflow API" --segment contabilidad');
    const dir = getLatestCampaignDir();
    const campaign = JSON.parse(readFileSync(resolve(dir!, 'campaign.json'), 'utf8'));

    expect(campaign.id).toMatch(/^CAMP-\d+$/);
    expect(campaign.product).toBeDefined();
    expect(campaign.channels).toHaveLength(6);
    expect(campaign.score).toBeGreaterThan(0);
    expect(campaign.status).toBe('draft');
  });

  it('generates scorecard.json with score field', () => {
    runCreativeAgent('--create --product "Docflow API" --segment contabilidad');
    const dir = getLatestCampaignDir();
    const scorecard = JSON.parse(readFileSync(resolve(dir!, 'scorecard.json'), 'utf8'));

    expect(typeof scorecard.score).toBe('number');
    expect(scorecard.score).toBeGreaterThanOrEqual(0);
    expect(scorecard.score).toBeLessThanOrEqual(100);
    expect(scorecard.benchmark).toBeDefined();
  });

  it('generates analysis.json with validation result', () => {
    runCreativeAgent('--create --product "Docflow API" --segment contabilidad');
    const dir = getLatestCampaignDir();
    const analysis = JSON.parse(readFileSync(resolve(dir!, 'analysis.json'), 'utf8'));

    expect(analysis.campaignId).toBeDefined();
    expect(analysis.uniqueness).toBeDefined();
  });
});

describe('Creative Agent — Channel Limits Compliance', () => {
  it('all channel copies respect max character limits', () => {
    runCreativeAgent('--create --product "Docflow API" --segment contabilidad');
    const dir = getLatestCampaignDir();
    const campaign = JSON.parse(readFileSync(resolve(dir!, 'campaign.json'), 'utf8'));

    const LIMITS: Record<string, number> = {
      x: 280,
      facebook: 2000,
      discord: 2000,
      telegram: 4096,
      linkedin: 3000,
    };

    for (const [ch, max] of Object.entries(LIMITS)) {
      const copy: string = campaign.copies[ch] || '';
      expect(copy.length, `${ch} copy exceeds ${max} chars`).toBeLessThanOrEqual(max);
    }
  });
});

describe('Creative Agent — Memory System', () => {
  it('--memory returns valid JSON with totalCampaigns', () => {
    const out = runCreativeAgent('--memory');
    const mem = JSON.parse(out);
    expect(typeof mem.totalCampaigns).toBe('number');
    expect(mem.evolution).toBeDefined();
  });
});
