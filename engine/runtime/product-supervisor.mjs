#!/usr/bin/env node
/**
 * Product Supervisor Bot — engine/runtime/product-supervisor.mjs
 * Tracks product lifecycle: creation→development→approval→distribution→confirmation
 * Reports to dashboard. 97% automated. Traffic-light status.
 */

import { writeFileSync, mkdirSync, readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const OUT = resolve('ops/runtime/product-lifecycle.json');
const TRACKING_DIR = resolve('ops/runtime/lifecycle');

const LIFECYCLE_STAGES = [
  { id:'creation', label:'Creation', order:1, autoCheck:true },
  { id:'development', label:'Development', order:2, autoCheck:true },
  { id:'approval', label:'Approval (Victor)', order:3, autoCheck:false },
  { id:'distribution', label:'Distribution', order:4, autoCheck:true },
  { id:'confirmation', label:'Confirmation', order:5, autoCheck:true }
];

function checkProductStage(product, stage) {
  const checks = {
    creation: () => existsSync(resolve('ops/catalog/products.json')),
    development: () => existsSync(resolve('ops/runtime/product-scores.json')),
    approval: () => {
      try {
        const idx = JSON.parse(readFileSync(resolve('ops/runtime/campaigns/index.json'), 'utf8'));
        return idx.campaigns?.some(c => c.status === 'approved');
      } catch { return false; }
    },
    distribution: () => {
      try {
        const outbox = resolve('ops/traffic/outbox');
        if (!existsSync(outbox)) return false;
        const files = readdirSync(outbox).filter(f => f.includes('publish') && f.endsWith('.json'));
        return files.length > 0;
      } catch { return false; }
    },
    confirmation: () => {
      try {
        const outbox = resolve('ops/traffic/outbox');
        if (!existsSync(outbox)) return false;
        const files = readdirSync(outbox).filter(f => f.includes('evidence') && f.endsWith('.md'));
        return files.length > 0;
      } catch { return false; }
    }
  };
  
  const check = checks[stage.id];
  if (!check) return { status:'unknown', color:'gray' };
  
  const passed = check();
  return {
    status: passed ? 'complete' : stage.autoCheck ? 'pending' : 'awaiting_approval',
    color: passed ? 'green' : stage.autoCheck ? 'yellow' : 'red',
    passed,
    auto: stage.autoCheck
  };
}

function generateProjectMap() {
  const modules = [
    { id:'lead-engine', name:'Lead Engine', path:'engine/leads/', deps:[], category:'data' },
    { id:'prospect-selector', name:'Prospect Selector', path:'engine/email/', deps:['lead-engine'], category:'data' },
    { id:'campaign-creative', name:'Creative Agent', path:'engine/campaigns/', deps:['prospect-selector'], category:'creation' },
    { id:'campaign-materializer', name:'Campaign Materializer', path:'engine/campaigns/', deps:['campaign-creative'], category:'creation' },
    { id:'campaign-unifier', name:'Campaign Unifier', path:'engine/campaigns/', deps:['campaign-materializer'], category:'creation' },
    { id:'product-engine', name:'Product Engine', path:'scripts/', deps:[], category:'quality' },
    { id:'product-improver', name:'Product Improver', path:'engine/products/', deps:['product-engine'], category:'quality' },
    { id:'production-gate', name:'Production Gate', path:'engine/runtime/', deps:[], category:'quality' },
    { id:'dashboard-monitor', name:'Dashboard Monitor', path:'engine/runtime/', deps:[], category:'monitoring' },
    { id:'product-supervisor', name:'Product Supervisor', path:'engine/runtime/', deps:['production-gate'], category:'monitoring' },
    { id:'rnd-engine', name:'R&D Engine', path:'engine/rnd/', deps:[], category:'innovation' },
    { id:'social-autopilot', name:'Social Autopilot', path:'scripts/traffic/', deps:['campaign-unifier'], category:'distribution' },
    { id:'full-pipeline', name:'Full Pipeline', path:'engine/runtime/', deps:['lead-engine','campaign-unifier','social-autopilot'], category:'orchestration' }
  ];
  
  // Check health of each module
  const map = modules.map(m => {
    const exists = existsSync(resolve(m.path));
    const hasFiles = exists ? readdirSync(resolve(m.path)).filter(f => f.endsWith('.mjs') || f.endsWith('.js') || f.endsWith('.md')).length > 0 : false;
    
    let color = 'green';
    if (!exists) color = 'red';
    else if (!hasFiles) color = 'yellow';
    
    return { ...m, exists, hasFiles, color };
  });
  
  // Calculate automation %
  const green = map.filter(m => m.color === 'green').length;
  const automation = Math.round((green / map.length) * 100);
  
  return {
    generatedAt: new Date().toISOString(),
    totalModules: map.length,
    green,
    yellow: map.filter(m => m.color === 'yellow').length,
    red: map.filter(m => m.color === 'red').length,
    automationPercent: automation,
    targetAutomation: 97,
    gap: 97 - automation,
    modules: map,
    interconnections: modules.filter(m => m.deps.length > 0).map(m => ({
      from: m.deps,
      to: m.id,
      label: `${m.name} depends on ${m.deps.join(', ')}`
    }))
  };
}

function main() {
  mkdirSync(TRACKING_DIR, { recursive: true });
  
  // Product lifecycle tracking
  const products = ['Docflow API', 'Script Premium Kit'];
  const tracking = [];
  
  for (const product of products) {
    const stages = LIFECYCLE_STAGES.map(stage => ({
      ...stage,
      ...checkProductStage(product, stage)
    }));
    
    const complete = stages.filter(s => s.passed).length;
    tracking.push({
      product,
      stages,
      progress: `${complete}/${stages.length} stages`,
      percent: Math.round((complete / stages.length) * 100),
      overallStatus: complete === stages.length ? 'complete' : complete >= 3 ? 'in_progress' : 'early'
    });
  }
  
  // Project map
  const map = generateProjectMap();
  
  const report = {
    generatedAt: new Date().toISOString(),
    productLifecycle: tracking,
    projectMap: map,
    supervisoryNotes: {
      automation: `${map.automationPercent}% (target 97%, gap: ${map.gap}%)`,
      criticalPath: 'Lead Engine → Creative Agent → Campaign Unifier → Social Autopilot → Full Pipeline',
      bottlenecks: map.modules.filter(m => m.color !== 'green').map(m => `${m.name}: ${m.color === 'red' ? 'MISSING' : 'NEEDS FILES'}`),
      nextActions: map.red > 0 ? ['Fix missing modules'] : map.yellow > 0 ? ['Add files to empty dirs'] : ['All modules green']
    }
  };
  
  writeFileSync(OUT, JSON.stringify(report, null, 2), 'utf8');
  
  console.log('=== PRODUCT SUPERVISOR BOT ===\n');
  
  console.log('📦 Product Lifecycle:');
  tracking.forEach(t => {
    t.stages.forEach(s => {
      const icon = s.color === 'green' ? '✅' : s.color === 'yellow' ? '🟡' : '🔴';
      console.log(`   ${icon} ${t.product} — ${s.label}: ${s.status}${!s.auto ? ' (requires Victor)' : ''}`);
    });
  });
  
  console.log(`\n🗺️ Project Map:`);
  console.log(`   🟢 ${map.green} | 🟡 ${map.yellow} | 🔴 ${map.red}`);
  console.log(`   Automation: ${map.automationPercent}% (target 97%)`);
  console.log(`   GAP: ${map.gap}%`);
  
  if (map.red > 0) {
    console.log('\n🔴 MISSING:');
    map.modules.filter(m => m.color === 'red').forEach(m => console.log(`   ${m.name}`));
  }
  
  console.log(`\n📄 Report: ${OUT}`);
}

main();
