#!/usr/bin/env node
/**
 * FULL ENGINE FLOW — engine/runtime/full-pipeline.mjs
 * Lead → Prospect → Campaign → Materialize → Approve → Publish
 * ONE command. No medias tintas.
 */
import { execSync } from 'node:child_process';

const STEPS = [
  { name:'Lead Engine', cmd:'node scripts/lead-engine.mjs --mode auto' },
  { name:'Prospect Selector MX', cmd:'node engine/email/prospect-selector.mjs general' },
  { name:'Prospect Selector US', cmd:'node engine/email/prospect-selector.mjs general' },
  { name:'Creative Agent — Docflow', cmd:'node engine/campaigns/creative-agent.mjs --create --product "Docflow API" --target contabilidad' },
  { name:'Creative Agent — Script Kit', cmd:'node engine/campaigns/creative-agent.mjs --create --product "Script Premium Kit" --target software' },
  { name:'Campaign Materialize — Docflow', cmd:'node engine/campaigns/campaign-materializer.mjs --product "Docflow API"' },
  { name:'Campaign Materialize — Script Kit', cmd:'node engine/campaigns/campaign-materializer.mjs --product "Script Premium Kit"' },
  { name:'Generate Campaign Index', cmd:'node -e "const{readdirSync,statSync,readFileSync,writeFileSync}=require(\"fs\");const{resolve,join}=require(\"path\");const d=resolve(\"ops/runtime/campaigns\");const c=readdirSync(d).filter(f=>statSync(join(d,f)).isDirectory()).map(f=>{try{const j=JSON.parse(readFileSync(join(d,f,\"campaign.json\"),\"utf8\"));return{id:f,product:j.product,score:j.score,status:j.status||\"draft\",channels:j.channels}}catch(e){return{id:f}}});writeFileSync(join(d,\"index.json\"),JSON.stringify({updated:new Date().toISOString(),total:c.length,campaigns:c},null,2))"' },
  { name:'Unified Dashboard', cmd:'node scripts/unified-dashboard-data.mjs' },
  { name:'Dashboard Monitor', cmd:'node engine/runtime/dashboard-monitor.mjs' },
  { name:'Production Gate', cmd:'node scripts/production-go-no-go.mjs' }
];

console.log('=== FULL ENGINE PIPELINE ===\n');
let errors = 0;

for (const step of STEPS) {
  process.stdout.write(`${step.name}... `);
  try {
    execSync(step.cmd, { stdio:'pipe', timeout:120000, cwd:process.cwd() });
    console.log('✅');
  } catch(e) {
    console.log('❌');
    errors++;
  }
}

console.log(`\n=== PIPELINE COMPLETE ===`);
console.log(`Steps: ${STEPS.length} | Errors: ${errors}`);
console.log(`Dashboard: http://localhost:4310`);
console.log(`\nNext: Open dashboard → Campaign Panel → Review → APPROVE`);
console.log(`After approval: node scripts/traffic/run-autopilot.mjs --live --channels linkedin,facebook,x,telegram,discord`);
