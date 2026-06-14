#!/usr/bin/env node
/**
 * generate-campaign-cards.mjs
 * Reads a campaign social pack JSON and renders one PNG card per channel
 * using Puppeteer (headless Chromium). Cards are saved alongside the pack.
 *
 * Usage:
 *   node scripts/traffic/generate-campaign-cards.mjs --campaign daily-2026-06-13-publish
 *   node scripts/traffic/generate-campaign-cards.mjs --packPath ops/traffic/outbox/social-pack-xxx.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const CHANNEL_SPECS = {
  linkedin:  { width: 1200, height: 627,  bg: '#0A66C2', accent: '#FFFFFF', label: 'LinkedIn'  },
  x:         { width: 1200, height: 675,  bg: '#000000', accent: '#FFFFFF', label: 'X'         },
  facebook:  { width: 1200, height: 630,  bg: '#1877F2', accent: '#FFFFFF', label: 'Facebook'  },
  telegram:  { width: 1200, height: 630,  bg: '#229ED9', accent: '#FFFFFF', label: 'Telegram'  },
  discord:   { width: 1200, height: 630,  bg: '#5865F2', accent: '#FFFFFF', label: 'Discord'   },
};

function parseArgs(argv) {
  const options = { packPath: '', campaign: '', outDir: 'ops/traffic/outbox' };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) continue;
    if (key in options) { options[key] = value; i += 1; }
  }
  return options;
}

function safeCampaign(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function resolvePackPath(options) {
  if (options.packPath) return path.resolve(options.packPath);
  if (options.campaign) {
    const id = safeCampaign(options.campaign);
    return path.resolve(options.outDir, `social-pack-${id}.json`);
  }
  // Auto-detect latest pack
  const dir = path.resolve(options.outDir);
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('social-pack-') && f.endsWith('.json'))
    .map(f => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!files.length) throw new Error('No social-pack JSON found in outbox.');
  return path.join(dir, files[0].f);
}

function truncate(text, max) {
  if (!text) return '';
  const clean = String(text).replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function buildHtml(channel, spec, pack) {
  const channelData = pack.channels?.[channel] || {};
  const copyText   = channelData.copyPaste || channelData.variants?.A || '';
  const firstLine  = copyText.split('\n').find(l => l.trim()) || pack.campaign || '';
  const bodyLines  = copyText.split('\n').filter(l => l.trim()).slice(1, 5);
  const proof      = pack.brand?.proofPoint ? truncate(pack.brand.proofPoint, 100) : '';
  const cta        = pack.funnel?.finalCta || pack.funnel?.trafficDestination || '';
  const ctaShort   = cta.replace(/\?.*$/, '').replace(/^https?:\/\//, '');
  const score      = channelData.selectedScore ?? pack.quality?.averageScore ?? 0;
  const lift       = channelData.projectedLiftPct ?? pack.quality?.projectedAverageLiftPct ?? 0;
  const campaign   = pack.campaign || '';
  const date       = (pack.generatedAt || '').slice(0, 10);

  const bodyHtml = bodyLines
    .map(l => `<p>${l.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{
    width:${spec.width}px;height:${spec.height}px;
    background:${spec.bg};
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
    color:${spec.accent};
    display:flex;flex-direction:column;overflow:hidden;position:relative;
  }
  .noise{
    position:absolute;inset:0;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
    pointer-events:none;z-index:0;
  }
  .gradient{
    position:absolute;inset:0;
    background:linear-gradient(135deg,rgba(255,255,255,0.10) 0%,rgba(0,0,0,0.25) 100%);
    pointer-events:none;z-index:0;
  }
  .content{
    position:relative;z-index:1;
    display:flex;flex-direction:column;height:100%;padding:52px 64px 40px;
  }
  .header{
    display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;
  }
  .logo{
    font-size:22px;font-weight:800;letter-spacing:-0.5px;
    opacity:0.95;
  }
  .badge{
    font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;
    background:rgba(255,255,255,0.15);
    border:1px solid rgba(255,255,255,0.25);
    border-radius:20px;padding:5px 14px;
    backdrop-filter:blur(4px);
  }
  .headline{
    font-size:42px;font-weight:800;line-height:1.15;
    letter-spacing:-1px;max-width:80%;
    flex:1;display:flex;align-items:center;
    text-shadow:0 2px 12px rgba(0,0,0,0.18);
  }
  .body{
    font-size:18px;line-height:1.55;opacity:0.88;
    margin-top:18px;max-width:75%;
  }
  .body p{margin-bottom:4px}
  .proof{
    margin-top:18px;font-size:14px;opacity:0.72;
    font-style:italic;max-width:70%;
  }
  .footer{
    display:flex;align-items:flex-end;justify-content:space-between;margin-top:auto;padding-top:24px;
    border-top:1px solid rgba(255,255,255,0.15);
  }
  .cta-block{}
  .cta-label{font-size:12px;text-transform:uppercase;letter-spacing:1px;opacity:0.65;margin-bottom:4px}
  .cta-url{
    font-size:16px;font-weight:700;
    background:rgba(255,255,255,0.18);
    border:1px solid rgba(255,255,255,0.3);
    border-radius:8px;padding:8px 18px;display:inline-block;
    backdrop-filter:blur(4px);
  }
  .meta{
    text-align:right;font-size:12px;opacity:0.55;line-height:1.6;
  }
  .score-pill{
    display:inline-flex;align-items:center;gap:6px;
    background:rgba(255,255,255,0.12);border-radius:20px;padding:4px 12px;
    font-size:13px;font-weight:600;margin-top:6px;
  }
  .score-pill .dot{width:8px;height:8px;border-radius:50%;background:#4ade80}
</style>
</head>
<body>
<div class="noise"></div>
<div class="gradient"></div>
<div class="content">
  <div class="header">
    <div class="logo">Tiger Lab</div>
    <div class="badge">${spec.label}</div>
  </div>
  <div class="headline">${truncate(firstLine, 90).replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</div>
  ${bodyHtml ? `<div class="body">${bodyHtml}</div>` : ''}
  ${proof ? `<div class="proof">${proof.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</div>` : ''}
  <div class="footer">
    <div class="cta-block">
      <div class="cta-label">Agenda ahora</div>
      <div class="cta-url">${ctaShort.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</div>
    </div>
    <div class="meta">
      ${campaign.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}<br>${date}
      <div class="score-pill"><span class="dot"></span>Score ${score}/100 · Lift ${lift}%</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const packPath = resolvePackPath(options);
  const pack     = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  const outDir   = path.dirname(packPath);
  const packBase = path.basename(packPath, '.json');

  const cardsDir = path.join(outDir, `${packBase}-cards`);
  fs.mkdirSync(cardsDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const channels = Object.keys(CHANNEL_SPECS).filter(ch => pack.channels?.[ch]);
  process.stdout.write(`Generating ${channels.length} cards for campaign: ${pack.campaign}\n`);

  const results = [];

  for (const channel of channels) {
    const spec     = CHANNEL_SPECS[channel];
    const html     = buildHtml(channel, spec, pack);
    const htmlPath = path.join(cardsDir, `card-${channel}.html`);
    const pngPath  = path.join(cardsDir, `card-${channel}.png`);

    fs.writeFileSync(htmlPath, html, 'utf8');

    const page = await browser.newPage();
    await page.setViewport({ width: spec.width, height: spec.height, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: pngPath, type: 'png', fullPage: false });
    await page.close();

    results.push({ channel, png: path.relative(process.cwd(), pngPath) });
    process.stdout.write(`  ✓ ${channel}: ${path.relative(process.cwd(), pngPath)}\n`);
  }

  await browser.close();

  // Write index
  const index = {
    generatedAt: new Date().toISOString(),
    campaign: pack.campaign,
    packPath: path.relative(process.cwd(), packPath),
    cards: results,
  };
  fs.writeFileSync(path.join(cardsDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');

  process.stdout.write(`\nCards saved to: ${path.relative(process.cwd(), cardsDir)}\n`);
}

main().catch(err => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});
