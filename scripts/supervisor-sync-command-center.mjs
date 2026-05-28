import fs from 'node:fs';
import path from 'node:path';

const tasksPath = path.resolve('ops/command-center/tasks.json');
const reportPathArg = process.argv[2] || 'ops/supervisor/latest-supervisor-report.example.json';
const reportPath = path.resolve(reportPathArg);

function parseJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toISODate(baseDate, offsetDays) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function dueWindowToDate(dueWindow) {
  const now = new Date();
  const normalized = String(dueWindow || '').toLowerCase();

  if (normalized === 'today') return toISODate(now, 0);
  if (normalized === '48h') return toISODate(now, 2);
  if (normalized === 'this week') return toISODate(now, 7);

  return toISODate(now, 3);
}

function normalizeOwner(owner) {
  const o = String(owner || '').toLowerCase();
  return o === 'human' ? 'human' : 'ai';
}

function normalizeStatus(status) {
  const s = String(status || '').toLowerCase();
  if (['todo', 'in-progress', 'done'].includes(s)) return s;
  return 'todo';
}

function normalizePriority(priority) {
  const p = String(priority || '').toUpperCase();
  if (['P0', 'P1', 'P2', 'P3'].includes(p)) return p;
  return 'P2';
}

function ensureArray(value, name) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
}

function syncTasks(commandCenter, report) {
  ensureArray(commandCenter.tasks, 'command center tasks');
  ensureArray(report.actions, 'supervisor actions');

  const existingById = new Map(commandCenter.tasks.map((t) => [t.id, t]));

  let created = 0;
  let updated = 0;

  for (const action of report.actions) {
    if (!action.id || !String(action.id).startsWith('S-')) {
      throw new Error(`Supervisor action id must start with S-: ${JSON.stringify(action)}`);
    }

    const normalized = {
      id: String(action.id),
      title: String(action.task || 'Untitled supervisor action'),
      area: String(action.area || 'supervision'),
      priority: normalizePriority(action.priority),
      owner: normalizeOwner(action.owner),
      status: normalizeStatus(action.status),
      dueDate: dueWindowToDate(action.dueWindow),
      nextAction: String(action.nextAction || 'Execute action from supervisor report'),
      repoPath: String(action.repoPath || '')
    };

    if (existingById.has(normalized.id)) {
      const target = existingById.get(normalized.id);
      Object.assign(target, normalized);
      updated += 1;
    } else {
      commandCenter.tasks.push(normalized);
      existingById.set(normalized.id, normalized);
      created += 1;
    }
  }

  commandCenter.meta = {
    ...(commandCenter.meta || {}),
    lastSupervisorSyncAt: new Date().toISOString(),
    lastSupervisorReport: path.relative(process.cwd(), reportPath).replace(/\\/g, '/')
  };

  return { created, updated };
}

function main() {
  const commandCenter = parseJson(tasksPath);
  const report = parseJson(reportPath);
  const result = syncTasks(commandCenter, report);

  fs.writeFileSync(tasksPath, `${JSON.stringify(commandCenter, null, 2)}\n`, 'utf8');

  console.log('Supervisor sync completed.');
  console.log(`- Report: ${path.relative(process.cwd(), reportPath).replace(/\\/g, '/')}`);
  console.log(`- Created tasks: ${result.created}`);
  console.log(`- Updated tasks: ${result.updated}`);
}

main();
