#!/usr/bin/env node
/**
 * Product R&D Engine — engine/rnd/rnd-engine.mjs
 * European SaaS Research & Development.
 * SCAN → VALIDATE → DECIDE (Invest / Zombie / Kill)
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PIPELINE_PATH = resolve('ops/runtime/rnd-pipeline.json');
const RND_DIR = resolve('ops/runtime/rnd');

const EU_SOURCES = [
  { name: 'ProductHunt EU', type: 'trending', categories: ['devtools','fintech','healthtech','climatetech','AI','automation'] },
  { name: 'Sifted.eu', type: 'news', categories: ['startups','funding','regulation','deep-tech'] },
  { name: 'Tech.eu', type: 'news', categories: ['SaaS','enterprise','mobility','sustainability'] },
  { name: 'EU-Startups.com', type: 'community', categories: ['early-stage','growth','scale-up'] },
  { name: 'Reddit r/europe', type: 'social', categories: ['tech','business','regulation'] },
  { name: 'Reddit r/SaaS', type: 'social', categories: ['micro-saas','b2b','productivity'] },
  { name: 'GitHub trending EU', type: 'code', categories: ['open-source','devtools','automation'] },
  { name: 'HN Show HN', type: 'social', categories: ['launch','mvp','side-project'] }
];

const EU_REGULATIONS = [
  { id: 'gdpr', name: 'GDPR', impact: 'data-privacy', compliance: 'high', tailwind: 8 },
  { id: 'ai-act', name: 'EU AI Act', impact: 'ai-governance', compliance: 'high', tailwind: 9 },
  { id: 'psd3', name: 'PSD3', impact: 'open-banking', compliance: 'medium', tailwind: 7 },
  { id: 'eidas2', name: 'eIDAS 2.0', impact: 'digital-identity', compliance: 'medium', tailwind: 8 },
  { id: 'gaia-x', name: 'Gaia-X', impact: 'cloud-sovereignty', compliance: 'medium', tailwind: 7 },
  { id: 'dsa', name: 'Digital Services Act', impact: 'platform-regulation', compliance: 'high', tailwind: 6 },
  { id: 'dma', name: 'Digital Markets Act', impact: 'platform-competition', compliance: 'low', tailwind: 5 }
];

// Seed ideas discovered from EU sources (simulating 1 day of scanning)
const DISCOVERED_IDEAS = [
  { name:'GDPR Auto-Compliance Scanner', cat:'devtools', eu:'high', desc:'API that scans codebases for GDPR gaps', competitors:['DataGuard','OneTrust','PrivacyTools'], signals:['regulatory','urgent'] },
  { name:'EU AI Act Readiness Platform', cat:'ailegal', eu:'critical', desc:'Compliance dashboard for EU AI Act requirements', competitors:['Credo AI','Holistic AI'], signals:['regulatory','mandatory'] },
  { name:'PSD3 Open Banking Connector', cat:'fintech', eu:'high', desc:'Single API for EU banks under PSD3 directive', competitors:['Tink','TrueLayer','Plaid EU'], signals:['regulatory','growth'] },
  { name:'SaaS Localization Engine EU', cat:'devtools', eu:'high', desc:'Auto-translate + localize SaaS for 24 EU languages', competitors:['Lokalise','Phrase','Crowdin'], signals:['market','underserved'] },
  { name:'Carbon Accounting API for EU SMEs', cat:'climatetech', eu:'mandatory', desc:'CSRD-compliant carbon tracking for SMEs', competitors:['Plan A','Sweep','Normative'], signals:['regulatory','mandatory'] },
  { name:'eIDAS Digital Identity Wallet', cat:'identity', eu:'high', desc:'EU digital identity wallet for cross-border auth', competitors:['Itsme','Verimi','NemID'], signals:['regulatory','gov-backed'] },
  { name:'Cross-Border VAT Automator', cat:'fintech', eu:'high', desc:'Automate VAT across 27 EU countries for digital products', competitors:['Quaderno','TaxJar EU','Octobat'], signals:['market','complex'] },
  { name:'EU Grant Discovery Platform', cat:'funding', eu:'high', desc:'AI-powered matching for EU innovation grants', competitors:['EU-Funding.com','AIMday'], signals:['funding','underserved'] },
  { name:'DevTools GDPR Middleware', cat:'devtools', eu:'high', desc:'Drop-in middleware that GDPR-proofs any API', competitors:['Skyflow','Evervault'], signals:['technical','urgent'] },
  { name:'Micro-SaaS Incubator EU', cat:'community', eu:'medium', desc:'Community + tools for EU indie hackers building SaaS', competitors:['IndieHackers EU','Makerpad'], signals:['community','growing'] }
];

function scoreIdea(idea) {
  const ratings = { devtools: 22, fintech: 20, ailegal: 24, climatetech: 23, identity: 20, funding: 16, community: 14 };
  const marketDemand = ratings[idea.cat] || 15;
  const competitionGap = idea.competitors.length <= 2 ? 22 : idea.competitors.length <= 4 ? 18 : 12;
  const feasibility = idea.cat === 'devtools' ? 18 : idea.cat === 'fintech' ? 14 : 16;
  const monetization = idea.cat === 'fintech' ? 20 : idea.cat === 'devtools' ? 18 : 15;
  const regulatory = idea.eu === 'critical' || idea.eu === 'mandatory' ? 10 : idea.eu === 'high' ? 8 : 5;
  
  const total = marketDemand + competitionGap + feasibility + monetization + regulatory;
  
  return {
    ...idea,
    scores: { marketDemand, competitionGap, feasibility, monetization, regulatory },
    totalScore: total,
    decision: total >= 80 ? 'INVEST' : total >= 50 ? 'ZOMBIE' : 'KILL'
  };
}

function runRNDCycle() {
  mkdirSync(RND_DIR, { recursive: true });
  
  console.log('=== PRODUCT R&D ENGINE ===');
  console.log(`EU Sources: ${EU_SOURCES.length}`);
  console.log(`Regulations tracked: ${EU_REGULATIONS.length}`);
  console.log(`Ideas discovered: ${DISCOVERED_IDEAS.length}\n`);
  
  const scored = DISCOVERED_IDEAS.map(scoreIdea).sort((a,b) => b.totalScore - a.totalScore);
  
  const invest = scored.filter(i => i.decision === 'INVEST');
  const zombie = scored.filter(i => i.decision === 'ZOMBIE');
  const killed = scored.filter(i => i.decision === 'KILL');
  
  console.log('=== DECISIONS ===');
  console.log(`💰 INVEST:  ${invest.length}  (≥80)`);
  console.log(`🧟 ZOMBIE: ${zombie.length}  (50-79)`);
  console.log(`💀 KILL:   ${killed.length}  (<50)\n`);
  
  console.log('💰 INVEST IDEAS:');
  invest.forEach(i => {
    console.log(`  ${i.name}`);
    console.log(`    Score: ${i.totalScore}/100 | Cat: ${i.cat} | EU: ${i.eu}`);
    console.log(`    Mkt:${i.scores.marketDemand} Comp:${i.scores.competitionGap} Feas:${i.scores.feasibility} Mon:${i.scores.monetization} Reg:${i.scores.regulatory}`);
    console.log(`    Competitors: ${i.competitors.join(', ')}`);
    console.log(`    → ${i.desc}\n`);
  });
  
  console.log('🧟 ZOMBIE (re-evaluate in 7 days):');
  zombie.forEach(i => console.log(`  ${i.name} — ${i.totalScore}/100`));
  
  console.log(`\n💀 KILLED: ${killed.length} ideas discarded`);
  
  // Generate pipeline
  const pipeline = {
    generatedAt: new Date().toISOString(),
    totalScanned: DISCOVERED_IDEAS.length,
    decisions: { invest: invest.length, zombie: zombie.length, killed: killed.length },
    investIdeas: invest.map(i => ({
      id: `RD-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
      name: i.name, category: i.cat, euRelevance: i.eu,
      totalScore: i.totalScore, scores: i.scores,
      competitors: i.competitors, description: i.desc,
      status: 'pending-review'
    })),
    zombieIdeas: zombie.map(i => ({ name: i.name, totalScore: i.totalScore, reEvaluateAt: new Date(Date.now() + 7*86400000).toISOString() })),
    killedIdeas: killed.map(i => ({ name: i.name, totalScore: i.totalScore, reason: 'Score below 50' }))
  };
  
  writeFileSync(PIPELINE_PATH, JSON.stringify(pipeline, null, 2), 'utf8');
  console.log(`\n📄 Pipeline saved: ${PIPELINE_PATH}`);
  
  // Weekly report
  const report = {
    week: new Date().toISOString().substring(0, 10),
    totalIdeas: scored.length,
    investRate: ((invest.length / scored.length) * 100).toFixed(1) + '%',
    zombieRate: ((zombie.length / scored.length) * 100).toFixed(1) + '%',
    killRate: ((killed.length / scored.length) * 100).toFixed(1) + '%',
    topCategories: [...new Set(scored.map(i => i.cat))].slice(0, 5),
    euRegulationImpact: 'GDPR + AI Act + PSD3 creating massive regulatory tailwind for EU SaaS',
    recommendation: invest.length > 0 ? `Build ${invest[0].name} first. EU regulatory tailwind + low competition.` : 'No invest ideas. Increase scanning frequency.'
  };
  
  writeFileSync(resolve(RND_DIR, `weekly-report-${report.week}.json`), JSON.stringify(report, null, 2), 'utf8');
  console.log(`📊 Weekly report: ops/runtime/rnd/weekly-report-${report.week}.json`);
  
  return pipeline;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--scan')) {
    console.log('Scanning EU sources...');
    // Simulate scan
    EU_SOURCES.forEach(s => console.log(`  📡 ${s.name}: ${s.categories.length} categories`));
    console.log(`\n✅ Discovered ${DISCOVERED_IDEAS.length} ideas\n`);
    runRNDCycle();
  } else if (args.includes('--pipeline')) {
    if (existsSync(PIPELINE_PATH)) {
      console.log(readFileSync(PIPELINE_PATH, 'utf8'));
    } else {
      console.log('No pipeline yet. Run --scan first.');
    }
  } else {
    runRNDCycle();
  }
}

main();
