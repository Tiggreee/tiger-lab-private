#!/usr/bin/env node
/**
 * Campaign Quality Verifier — engine/campaigns/quality-verifier.mjs
 * Verifies each campaign is production-ready per social network.
 * Checks: copy length, format, presence, consistency, platforms specs.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const CAMPAIGNS_DIR = resolve('ops/runtime/campaigns');
const OUT = resolve('ops/runtime/campaign-quality.json');

const PLATFORM_SPECS = {
  email:    { maxChars:5000, fmt:'html', required:true },
  linkedin: { maxChars:3000, fmt:'txt',  required:true },
  x:        { maxChars:280,  fmt:'txt',  required:true },
  facebook: { maxChars:2000, fmt:'txt',  required:true },
  telegram: { maxChars:4096, fmt:'md',   required:true },
  discord:  { maxChars:2000, fmt:'md',   required:true }
};

function verifyCampaign(dir) {
  const campaignPath = join(CAMPAIGNS_DIR, dir, 'campaign.json');
  if (!existsSync(campaignPath)) return null;
  
  const campaign = JSON.parse(readFileSync(campaignPath, 'utf8'));
  const product = campaign.product || 'Unknown';
  const results = { dir, product, score:0, channels:{}, issues:[], ready:false };
  
  for (const [ch, spec] of Object.entries(PLATFORM_SPECS)) {
    const ext = spec.fmt === 'html' ? 'html' : spec.fmt === 'md' ? 'md' : 'txt';
    const filePath = join(CAMPAIGNS_DIR, dir, `${ch}.${ext}`);
    
    if (!existsSync(filePath)) {
      results.channels[ch] = { status:'MISSING', score:0, issue:'File not found' };
      results.issues.push(`${ch}: file missing`);
      continue;
    }
    
    let content;
    try { content = readFileSync(filePath, 'utf8'); } catch { content = ''; }
    
    const len = content.length;
    const overLimit = len > spec.maxChars;
    const tooShort = len < 20;
    const hasEmoji = /[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(content);
    const hasCTA = /http|com\/|\.dev|\.io|cal\.com|tigerlab/i.test(content);
    const hasBullets = content.includes('✅') || content.includes('•') || content.includes('-');
    
    let chScore = 100;
    const issues = [];
    
    if (overLimit) { chScore -= 40; issues.push(`Over limit: ${len}/${spec.maxChars}`); }
    if (tooShort) { chScore -= 60; issues.push(`Too short: ${len} chars`); }
    if (!hasCTA) { chScore -= 20; issues.push('No CTA/link'); }
    if (ch === 'linkedin' && !content.includes('#')) { chScore -= 10; issues.push('No hashtags'); }
    if (ch === 'email' && !/<html|<body/i.test(content)) { chScore -= 15; issues.push('Plain text, not HTML'); }
    
    results.channels[ch] = {
      status: chScore >= 70 ? 'READY' : chScore >= 40 ? 'NEEDS_WORK' : 'FAIL',
      score: Math.max(0, chScore),
      length: len,
      overLimit,
      hasCTA,
      hasEmoji,
      hasBullets,
      issues
    };
    
    if (issues.length) results.issues.push(`${ch}: ${issues.join('; ')}`);
  }
  
  const scores = Object.values(results.channels).map(c => c.score);
  results.score = Math.round(scores.reduce((a,b) => a+b, 0) / scores.length);
  results.ready = results.score >= 70 && Object.values(results.channels).every(c => c.status === 'READY');
  
  return results;
}

function main() {
  mkdirSync(resolve('ops/runtime'), { recursive: true });
  
  const dirs = readdirSync(CAMPAIGNS_DIR).filter(d => {
    try { return statSync(join(CAMPAIGNS_DIR, d)).isDirectory(); } catch { return false; }
  });
  
  console.log('=== CAMPAIGN QUALITY VERIFIER ===\n');
  
  const results = dirs.map(verifyCampaign).filter(Boolean);
  
  results.forEach(r => {
    const icon = r.ready ? '✅' : '❌';
    console.log(`${icon} ${r.product} (${r.dir}): ${r.score}/100`);
    if (r.issues.length) r.issues.forEach(i => console.log(`   ⚠️ ${i}`));
  });
  
  const ready = results.filter(r => r.ready).length;
  const total = results.length;
  
  const report = {
    generatedAt: new Date().toISOString(),
    total,
    ready,
    notReady: total - ready,
    productionReadiness: `${Math.round((ready/total)*100)}%`,
    results
  };
  
  writeFileSync(OUT, JSON.stringify(report, null, 2), 'utf8');
  
  console.log(`\n📊 Production Ready: ${ready}/${total} (${report.productionReadiness})`);
  console.log(`📄 Report: ${OUT}`);
}

main();
