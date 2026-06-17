#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const INSTRUCTIONS_DIR = resolve('.github/instructions');
const AGENTS_MD = resolve('AGENTS.md');
const SKILLS_DIR = resolve('.github/skills');

function readInstructionFiles() {
  const files = [];

  if (existsSync(INSTRUCTIONS_DIR)) {
    for (const f of readdirSync(INSTRUCTIONS_DIR)) {
      if (f.endsWith('.md')) {
        const content = readFileSync(join(INSTRUCTIONS_DIR, f), 'utf8');
        files.push({ name: f, content, source: 'instructions' });
      }
    }
  }

  if (existsSync(SKILLS_DIR)) {
    for (const dir of readdirSync(SKILLS_DIR)) {
      const skillFile = join(SKILLS_DIR, dir, 'SKILL.md');
      if (existsSync(skillFile)) {
        const content = readFileSync(skillFile, 'utf8');
        files.push({ name: `${dir}/SKILL.md`, content, source: 'skills' });
      }
    }
  }

  return files;
}

function extractRules(content) {
  const lines = content.split('\n');
  const rules = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      rules.push(trimmed.replace(/^[-*]\s+/, ''));
      inList = true;
    } else if (inList && trimmed === '') {
      inList = false;
    }
  }

  return rules;
}

export function loadSkills(agentName) {
  const allFiles = readInstructionFiles();
  const applicable = [];

  for (const file of allFiles) {
    const applyMatch = file.content.match(/applyTo:\s*"([^"]+)"/);
    if (applyMatch) {
      const patterns = applyMatch[1].split(',').map(p => p.trim().replace(/[{}]/g, ''));
      const agentPaths = getAgentPaths(agentName);
      const matches = patterns.some(p => agentPaths.some(ap => ap.includes(p.replace('/**', '').replace('*', ''))));
      if (matches) {
        applicable.push(file);
      }
    } else {
      applicable.push(file);
    }
  }

  return applicable;
}

export function injectSkills(promptContent, agentName) {
  const skills = loadSkills(agentName);
  if (skills.length === 0) return promptContent;

  const rulesBlock = skills
    .flatMap(s => extractRules(s.content))
    .filter(r => r.length > 5)
    .slice(0, 20)
    .map(r => `- ${r}`)
    .join('\n');

  if (!rulesBlock) return promptContent;

  const injection = `\n\n## Active Governance Rules\n\n${rulesBlock}\n`;

  const insertPoint = promptContent.indexOf('## Rules');
  if (insertPoint !== -1) {
    return promptContent.slice(0, insertPoint) + injection + '\n' + promptContent.slice(insertPoint);
  }

  return promptContent + injection;
}

function getAgentPaths(agentName) {
  const map = {
    'maker': ['server/', 'src/', 'engine/', 'scripts/'],
    'checker': ['server/', 'src/', 'engine/', 'scripts/'],
    'lead-engine': ['engine/leads/', 'ops/database/', 'scripts/']
  };
  return map[agentName] || ['server/', 'src/', 'engine/'];
}

export function listAvailableSkills() {
  const files = readInstructionFiles();
  return files.map(f => ({
    name: f.name,
    source: f.source,
    rules: extractRules(f.content).length
  }));
}

const args = process.argv.slice(2);

if (args.includes('--list')) {
  console.log(JSON.stringify(listAvailableSkills(), null, 2));
} else if (args.includes('--inject')) {
  const agentName = args[args.indexOf('--inject') + 1];
  const promptPath = args[args.indexOf('--inject') + 2];
  if (!agentName || !promptPath) {
    console.error('Usage: --inject <agentName> <promptPath>');
    process.exit(1);
  }
  const prompt = readFileSync(resolve(promptPath), 'utf8');
  const injected = injectSkills(prompt, agentName);
  console.log(injected);
} else if (args.includes('--skills-for')) {
  const agentName = args[args.indexOf('--skills-for') + 1];
  const skills = loadSkills(agentName);
  console.log(`Skills for ${agentName}: ${skills.length} files`);
  skills.forEach(s => console.log(`  ${s.source}/${s.name} — ${extractRules(s.content).length} rules`));
} else {
  console.log('Skills Loader — inject governance rules into agent prompts');
  console.log('  --list                    List all available skills');
  console.log('  --inject <agent> <path>   Inject skills into a prompt file');
  console.log('  --skills-for <agent>      Show which skills apply to an agent');
}
