#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const TASKS_PATH = path.resolve('ops/command-center/tasks.json');
const ARCHIVE_PATH = path.resolve('ops/runtime/tasks-archive.json');
const REPORT_PATH = path.resolve('ops/runtime/dashboard-prioritization-report.json');
const ARCHIVE_AFTER_MS = 24 * 60 * 60 * 1000;

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveJSON(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function daysUntil(dateISO) {
  const now = new Date();
  const due = new Date(dateISO + 'T23:59:59');
  return Math.ceil((due.getTime() - now.getTime()) / 86400000);
}

function prioritize(tasks) {
  const archive = [];
  const active = [];

  for (const t of tasks) {
    const d = daysUntil(t.dueDate);

    if (t.status === 'done') {
      const doneAt = t.doneAt || t.updatedAt || new Date().toISOString();
      if (Date.now() - new Date(doneAt).getTime() > ARCHIVE_AFTER_MS) {
        archive.push(t);
        continue;
      }
    }

    if (t.status !== 'done' && d < 0 && t.priority !== 'P0') {
      t.priority = t.priority === 'P1' ? 'P0' : t.priority === 'P2' ? 'P1' : 'P2';
      t.priorityReason = `Auto-elevada: vencida hace ${Math.abs(d)} día(s)`;
    }

    if (t.status !== 'done' && d < 0 && t.priority === 'P0') {
      t.blockedDays = Math.abs(d);
      t.alert = `P0 vencida hace ${Math.abs(d)} día(s) — requiere acción inmediata`;
    }

    t.daysUntilDue = d;
    active.push(t);
  }

  active.sort((a, b) => {
    const pOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const pa = pOrder[a.priority] || 99;
    const pb = pOrder[b.priority] || 99;
    if (pa !== pb) return pa - pb;
    return (a.daysUntilDue ?? 99) - (b.daysUntilDue ?? 99);
  });

  const alerts = active.filter(t => t.alert).map(t => ({ id: t.id, title: t.title, alert: t.alert }));

  return { active, archive, alerts };
}

function main() {
  const data = loadJSON(TASKS_PATH);
  const existingArchive = fs.existsSync(ARCHIVE_PATH) ? loadJSON(ARCHIVE_PATH) : { archived: [] };

  const { active, archive, alerts } = prioritize(data.tasks);

  existingArchive.archived.push(...archive.map(t => ({
    ...t,
    archivedAt: new Date().toISOString()
  })));

  data.tasks = active;
  data.meta.lastPrioritizedAt = new Date().toISOString();

  saveJSON(TASKS_PATH, data);
  saveJSON(ARCHIVE_PATH, existingArchive);

  const report = {
    prioritizedAt: new Date().toISOString(),
    totalActive: active.length,
    archivedCount: archive.length,
    overdueCount: active.filter(t => (t.daysUntilDue ?? 0) < 0).length,
    alerts,
    recommendedFocus: active.filter(t => t.priority === 'P0' && t.status !== 'done').slice(0, 3).map(t => t.title)
  };

  saveJSON(REPORT_PATH, report);

  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     DASHBOARD PRIORITIZATION REPORT       ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Activas: ${report.totalActive}`);
  console.log(`  Archivadas: ${report.archivedCount}`);
  console.log(`  Vencidas: ${report.overdueCount}`);
  console.log(`  Alertas: ${report.alerts.length}`);
  console.log('');
  if (report.recommendedFocus.length > 0) {
    console.log('  🎯 Enfoque recomendado:');
    report.recommendedFocus.forEach((r, i) => console.log(`     ${i + 1}. ${r}`));
  }
  if (report.alerts.length > 0) {
    console.log('');
    console.log('  🚨 Alertas:');
    report.alerts.forEach(a => console.log(`     [${a.id}] ${a.alert}`));
  }
  console.log('');
  console.log(`  Reporte: ${REPORT_PATH}`);
  console.log('');
}

main();
