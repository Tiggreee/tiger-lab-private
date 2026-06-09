#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const agentsDir = path.join(root, '.github', 'copilot', 'agents');

const requiredFiles = [
  'agent-master.yaml',
  'agent-pipelines.yaml',
  'agent-docs.yaml',
  'agent-products.yaml',
  'agent-traffic.yaml',
  'agent-runtime.yaml',
  'agent-bots.yaml',
  'agent-audit.yaml',
  'agent-tiggreeeon.yaml',
];

const requiredRootKeys = [
  'name',
  'version',
  'mission',
  'scope',
  'capabilities',
  'inputs',
  'outputs',
  'success_criteria',
];

const standardCapabilities = [
  'repo_navigation',
  'code_generation',
  'file_editing',
  'pull_request_creation',
];

const expectedMasterHandoffs = [
  'pipelines',
  'docs',
  'products',
  'traffic',
  'runtime',
  'bots',
  'audit',
];

const errors = [];
const missions = new Map();

function read(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function hasRootKey(content, key) {
  const re = new RegExp(`^${key}:\\s*$|^${key}:\\s+.+$`, 'm');
  return re.test(content);
}

function getArrayBlock(content, key) {
  const lines = content.split(/\r?\n/);
  const idx = lines.findIndex((line) => line.trim() === `${key}:`);
  if (idx === -1) return [];

  const values = [];
  for (let i = idx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*:\s*(.*)?$/.test(line)) break;
    const itemMatch = line.match(/^\s{2}-\s+(.+)$/);
    if (itemMatch) values.push(itemMatch[1].trim());
  }
  return values;
}

function getNestedArrayBlock(content, parentKey, childKey) {
  const lines = content.split(/\r?\n/);
  const pIdx = lines.findIndex((line) => line.trim() === `${parentKey}:`);
  if (pIdx === -1) return [];

  let cIdx = -1;
  for (let i = pIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*:\s*(.*)?$/.test(line)) break;
    if (line.trim() === `${childKey}:`) {
      cIdx = i;
      break;
    }
  }

  if (cIdx === -1) return [];

  const values = [];
  for (let i = cIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*:\s*(.*)?$/.test(line)) break;
    const itemMatch = line.match(/^\s{4}-\s+(.+)$/);
    if (itemMatch) values.push(itemMatch[1].trim());
  }
  return values;
}

function getNestedMap(content, parentKey) {
  const lines = content.split(/\r?\n/);
  const pIdx = lines.findIndex((line) => line.trim() === `${parentKey}:`);
  if (pIdx === -1) return {};

  const out = {};
  for (let i = pIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*:\s*(.*)?$/.test(line)) break;
    const m = line.match(/^\s{2}([A-Za-z0-9_-]+):\s+(.+)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function getScalar(content, key) {
  const lines = content.split(/\r?\n/);
  const match = lines.find((line) => line.match(new RegExp(`^${key}:\\s+.+$`)));
  if (!match) return '';
  return match.replace(new RegExp(`^${key}:\\s+`), '').trim();
}

function getBooleanFlag(content, keyPath, expected) {
  const lines = content.split(/\r?\n/);
  const [parent, child] = keyPath;
  const pIdx = lines.findIndex((line) => line.trim() === `${parent}:`);
  if (pIdx === -1) return false;

  for (let i = pIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*:\s*(.*)?$/.test(line)) break;
    const m = line.match(new RegExp(`^\\s{2}${child}:\\s+(true|false)\\s*$`));
    if (m) return m[1] === String(expected);
  }

  return false;
}

if (!fs.existsSync(agentsDir)) {
  errors.push('Missing directory .github/copilot/agents');
} else {
  for (const file of requiredFiles) {
    const fullPath = path.join(agentsDir, file);
    const content = read(fullPath);

    if (content === null) {
      errors.push(`Missing required file: ${path.join('.github/copilot/agents', file)}`);
      continue;
    }

    for (const key of requiredRootKeys) {
      if (!hasRootKey(content, key)) {
        errors.push(`${file}: missing root key '${key}'`);
      }
    }

    const mission = getScalar(content, 'mission');
    if (!mission) {
      errors.push(`${file}: mission must not be empty`);
    } else if (missions.has(mission)) {
      errors.push(`${file}: mission duplicates ${missions.get(mission)}`);
    } else {
      missions.set(mission, file);
    }

    const scopeInclude = getNestedArrayBlock(content, 'scope', 'include');
    if (scopeInclude.length === 0) {
      errors.push(`${file}: scope.include must contain at least one path`);
    }

    const inputs = getArrayBlock(content, 'inputs');
    if (inputs.length === 0) {
      errors.push(`${file}: inputs must contain at least one item`);
    }

    const outputs = getArrayBlock(content, 'outputs');
    if (outputs.length === 0) {
      errors.push(`${file}: outputs must contain at least one item`);
    }

    const successCriteria = getArrayBlock(content, 'success_criteria');
    if (successCriteria.length === 0) {
      errors.push(`${file}: success_criteria must contain at least one item`);
    }

    const caps = getArrayBlock(content, 'capabilities');
    if (file === 'agent-tiggreeeon.yaml') {
      if (caps.length !== 1 || caps[0] !== 'repo_navigation') {
        errors.push(`${file}: capabilities must be exactly ['repo_navigation']`);
      }
      if (!hasRootKey(content, 'mode')) {
        errors.push(`${file}: missing root key 'mode'`);
      }
      if (!getBooleanFlag(content, ['mode', 'watch_only'], true)) {
        errors.push(`${file}: mode.watch_only must be true`);
      }
      if (!getBooleanFlag(content, ['mode', 'allow_file_editing'], false)) {
        errors.push(`${file}: mode.allow_file_editing must be false`);
      }
      if (!getBooleanFlag(content, ['mode', 'allow_code_generation'], false)) {
        errors.push(`${file}: mode.allow_code_generation must be false`);
      }
      if (!getBooleanFlag(content, ['mode', 'allow_pull_request_creation'], false)) {
        errors.push(`${file}: mode.allow_pull_request_creation must be false`);
      }
    } else {
      for (const cap of standardCapabilities) {
        if (!caps.includes(cap)) {
          errors.push(`${file}: missing capability '${cap}'`);
        }
      }

      if (file === 'agent-master.yaml') {
        const handoffs = getNestedMap(content, 'handoffs');
        for (const key of expectedMasterHandoffs) {
          if (!handoffs[key]) {
            errors.push(`${file}: missing handoffs.${key}`);
          }
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Copilot agents validation failed:\n');
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
}

console.log('Copilot agents validation passed.');
