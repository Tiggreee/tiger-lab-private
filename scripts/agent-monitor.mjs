import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const AGENT_PATHS = [
  { dir: join(ROOT, 'agents'), type: 'project', ext: '.agent.md' },
  { dir: join(ROOT, '.github', 'agents'), type: 'release', ext: '.agent.md' },
  { dir: join(ROOT, '.github', 'copilot', 'agents'), type: 'copilot', ext: '.yaml' }
];

const OUTPUT_PATH = join(ROOT, 'ops', 'runtime', 'agent-monitor.json');

function findAgents() {
  const agents = [];
  for (const { dir, type, ext } of AGENT_PATHS) {
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter(f => f.endsWith(ext));
    for (const file of files) {
      const name = file.replace(ext, '');
      const displayName = name
        .replace(/^agent-/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
      agents.push({
        id: name,
        name: displayName,
        file: join(dir, file),
        type,
        ext
      });
    }
  }
  return agents.sort((a, b) => a.id.localeCompare(b.id));
}

function hasScript(name) {
  const scriptsDir = join(ROOT, 'scripts');
  if (!existsSync(scriptsDir)) return false;
  const files = readdirSync(scriptsDir, { recursive: true }).filter(f => f.endsWith('.mjs'));
  const searchTerms = [
    name.toLowerCase().replace(/agent/gi, '').replace(/-/g, '').trim(),
    name.toLowerCase().replace(/^agent-/, '').replace(/-/g, '')
  ];
  for (const file of files) {
    const content = readFileSync(join(ROOT, 'scripts', file), 'utf-8').toLowerCase();
    for (const term of searchTerms) {
      if (term.length > 3 && content.includes(term)) return true;
    }
  }
  return false;
}

function hasWorkflow(name) {
  const workflowsDir = join(ROOT, '.github', 'workflows');
  if (!existsSync(workflowsDir)) return [];
  const matched = [];
  const files = readdirSync(workflowsDir).filter(f => f.endsWith('.yml'));
  const searchTerms = [
    name.toLowerCase().replace(/agent/gi, '').replace(/-/g, '').trim(),
    ...name.toLowerCase().split('-').filter(s => s.length > 3)
  ];
  for (const file of files) {
    const content = readFileSync(join(workflowsDir, file), 'utf-8').toLowerCase();
    for (const term of searchTerms) {
      if (term.length > 3 && content.includes(term)) {
        matched.push(file);
        break;
      }
    }
  }
  return matched;
}

function hasOutputEvidence(name) {
  const opsDir = join(ROOT, 'ops');
  if (!existsSync(opsDir)) return false;
  const searchTerms = [
    name.toLowerCase().replace(/agent/gi, '').replace(/-/g, '').trim(),
    ...name.toLowerCase().split('-').filter(s => s.length > 4)
  ];
  const walkDir = (dir) => {
    if (!existsSync(dir)) return false;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (walkDir(fullPath)) return true;
      } else {
        const content = readFileSync(fullPath, 'utf-8').toLowerCase();
        for (const term of searchTerms) {
          if (term.length > 4 && content.includes(term)) return true;
        }
      }
    }
    return false;
  };
  return walkDir(opsDir);
}

function checkMonetizationContribution(name, type) {
  const lowerName = name.toLowerCase();

  const directMonetization = [
    'monetization',
    'leadintelligence',
    'leadanalyzer',
    'botorchestrator',
    'products',
    'traffic',
    'landingsocial'
  ];

  const indirectMonetization = [
    'dashboards',
    'dashboardprioritization',
    'master',
    'runtime',
    'pipelines',
    'contentengine',
    'githubpolicymonitor'
  ];

  const normalized = lowerName.replace(/[^a-z0-9]/g, '');

  if (directMonetization.some(m => normalized.includes(m))) {
    return 'directa';
  }
  if (indirectMonetization.some(m => normalized.includes(m))) {
    return 'indirecta';
  }
  if (type === 'release' || normalized.includes('audit') || normalized.includes('docs')
    || normalized.includes('tiggreeeon') || normalized.includes('architect')) {
    return 'soporte';
  }
  return 'indirecta';
}

function evaluateAgent(agent) {
  const workflows = hasWorkflow(agent.id);
  const hasScriptRef = hasScript(agent.id);
  const hasEvidence = hasOutputEvidence(agent.id);
  const monetizationType = checkMonetizationContribution(agent.id, agent.type);

  const channels = [];
  if (workflows.length > 0) channels.push(`workflows: ${workflows.join(', ')}`);
  if (hasScriptRef) channels.push('script');
  if (hasEvidence) channels.push('ops evidence');

  const isActive = workflows.length > 0 || hasScriptRef || hasEvidence;

  let contribution = 'no';
  let contributionDetail = '';
  if (monetizationType === 'directa') {
    contribution = 'si';
    contributionDetail = 'Genera ingresos directamente (leads, ventas, pricing)';
  } else if (monetizationType === 'indirecta') {
    contribution = 'si';
    contributionDetail = 'Soporta infraestructura de monetizacion (automacion, pipelines, contenido)';
  } else {
    contribution = 'parcial';
    contributionDetail = 'Soporte/gobernanza (no genera ingresos directamente)';
  }

  return {
    id: agent.id,
    name: agent.name,
    type: agent.type === 'copilot' ? 'Copilot Agent' : agent.type === 'release' ? 'Release Auditor' : 'Project Agent',
    active: isActive,
    monetizationContribution: contribution,
    contributionDetail: contributionDetail,
    monetizationType: monetizationType,
    integrationChannels: channels,
    evidence: hasEvidence,
    workflowCount: workflows.length,
    hasScript: hasScriptRef
  };
}

function main() {
  console.log('Running agent monitor...\n');

  const agents = findAgents();
  console.log(`Found ${agents.length} agent definitions\n`);

  const results = agents.map(evaluateAgent);

  const activeCount = results.filter(r => r.active).length;
  const directMonetization = results.filter(r => r.monetizationType === 'directa').length;
  const indirectMonetization = results.filter(r => r.monetizationType === 'indirecta').length;
  const soporteCount = results.filter(r => r.monetizationType === 'soporte').length;

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalAgents: results.length,
      activeAgents: activeCount,
      inactiveAgents: results.length - activeCount,
      directMonetization: directMonetization,
      indirectMonetization: indirectMonetization,
      supportGovernance: soporteCount,
      monetizationContributing: results.filter(r => r.monetizationContribution === 'si').length
    },
    agents: results
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`  Active: ${activeCount}/${results.length}`);
  console.log(`  Direct monetization: ${directMonetization}`);
  console.log(`  Indirect monetization: ${indirectMonetization}`);
  console.log(`  Support/Governance: ${soporteCount}`);
  console.log(`\nReport saved: ${OUTPUT_PATH}\n`);

  // Detail
  for (const r of results) {
    const icon = r.active ? '🟢' : '🔴';
    const monetIcon = r.monetizationContribution === 'si' ? '💰' : r.monetizationContribution === 'parcial' ? '🔧' : '⏸️';
    console.log(`  ${icon} ${monetIcon} ${r.name} (${r.type})`);
    console.log(`       Active: ${r.active} | Monetization: ${r.monetizationContribution} (${r.monetizationType})`);
    if (r.integrationChannels.length > 0) console.log(`       Integration: ${r.integrationChannels.join(', ')}`);
    console.log('');
  }
}

import { mkdirSync } from 'fs';
main();
