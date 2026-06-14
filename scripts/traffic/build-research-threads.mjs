#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const options = {
    outPath: 'ops/runtime/research-threads.json',
    minThreads: 5
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      continue;
    }

    const key = item.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      continue;
    }

    if (key === 'outPath') {
      options.outPath = value;
      index += 1;
      continue;
    }

    if (key === 'minThreads') {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.minThreads = parsed;
      }
      index += 1;
    }
  }

  return options;
}

function safeReadJson(relPath) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(relPath), 'utf8'));
  } catch {
    return null;
  }
}

function safeReadJsonLines(relPath) {
  try {
    return fs
      .readFileSync(path.resolve(relPath), 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildEventThread(events) {
  const totals = new Map();
  let latest = '';

  for (const event of events) {
    const type = String(event.type || 'unknown');
    totals.set(type, (totals.get(type) || 0) + 1);
    const occurredAt = String(event.occurredAt || '');
    if (occurredAt > latest) {
      latest = occurredAt;
    }
  }

  const top = [...totals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([type, count]) => `${type}:${count}`);

  return {
    id: 'thread-funnel-events',
    type: 'investigation',
    title: 'Funnel con trazabilidad real',
    angle: 'Demostrar que el sistema tiene senal operativa real y no solo promesas.',
    hypothesis: 'Cuando hay trazabilidad por evento, la conversacion comercial sube de calidad.',
    evidence: [
      `Eventos totales analizados: ${events.length}`,
      `Eventos top: ${top.join(', ') || 'sin eventos registrados'}`,
      `Ultimo evento observado: ${latest || 'no disponible'}`
    ],
    recommendedCta: 'Agenda diagnostico y revisamos tu funnel actual en 15 min.',
    sourceFiles: ['ops/runtime/funnel-events.jsonl']
  };
}

function buildCampaignThread(dashboard) {
  const recent = Array.isArray(dashboard?.campaigns?.recent) ? dashboard.campaigns.recent : [];
  const top = recent
    .filter((item) => Number(item.avgScore || 0) > 0)
    .sort((a, b) => Number(b.avgScore || 0) - Number(a.avgScore || 0))
    .slice(0, 3);

  const avgScore =
    top.length > 0
      ? Math.round(top.reduce((sum, item) => sum + Number(item.avgScore || 0), 0) / top.length)
      : 0;

  return {
    id: 'thread-campaign-performance',
    type: 'improvement',
    title: 'Campanas con score verificable',
    angle: 'Usar rendimiento reciente para evitar copy generico y subir probabilidad de respuesta.',
    hypothesis: 'Copys con score alto y enfoque de dolor concreto convierten mejor.',
    evidence: [
      `Campanas recientes consideradas: ${recent.length}`,
      `Top campanas por score: ${top.map((item) => item.name).join(', ') || 'sin historico util'}`,
      `Promedio de score en top: ${avgScore}`
    ],
    recommendedCta: 'Te muestro el benchmark de score y ajustamos tu campana en vivo.',
    sourceFiles: ['ops/runtime/dashboard-unified.json', 'ops/traffic/outbox/']
  };
}

function buildLeadResponseThread(leadLog) {
  const items = Array.isArray(leadLog?.items) ? leadLog.items : [];
  const valid = items.filter((item) => !String(item.leadId || '').startsWith('sample-'));
  const responseMinutes = valid
    .map((item) => {
      const start = Date.parse(item.leadCapturedAt || '');
      const end = Date.parse(item.firstHumanReplyAt || '');
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return null;
      }
      return Math.round((end - start) / 60000);
    })
    .filter((value) => Number.isFinite(value));

  const avgMinutes =
    responseMinutes.length > 0
      ? Math.round(responseMinutes.reduce((sum, value) => sum + value, 0) / responseMinutes.length)
      : null;

  return {
    id: 'thread-lead-response',
    type: 'development',
    title: 'Velocidad de respuesta y cierre',
    angle: 'Conectar tiempos de respuesta con probabilidad de agendar diagnostico.',
    hypothesis: 'Respuestas mas rapidas sostienen el interes y aumentan cierres iniciales.',
    evidence: [
      `Leads con respuesta real analizados: ${valid.length}`,
      `Tiempo promedio primera respuesta: ${avgMinutes === null ? 'sin datos' : `${avgMinutes} min`}`,
      `Canales detectados: ${[...new Set(valid.map((item) => item.channel).filter(Boolean))].join(', ') || 'sin datos'}`
    ],
    recommendedCta: 'Compartenos tu SLA de respuesta y te proponemos un flujo de mejora en 24h.',
    sourceFiles: ['ops/traffic/lead-response-log.json']
  };
}

function buildTaskThread(tasks) {
  const list = Array.isArray(tasks?.tasks) ? tasks.tasks : [];
  const open = list.filter((item) => String(item.status || '').toLowerCase() === 'todo').length;

  return {
    id: 'thread-execution-gap',
    type: 'improvement',
    title: 'Brecha entre estrategia y ejecucion',
    angle: 'Mostrar que la prioridad operativa se resuelve con automatizacion concreta.',
    hypothesis: 'Reducir tareas en estado todo libera tiempo para ventas y delivery.',
    evidence: [
      `Tareas totales en command center: ${list.length}`,
      `Tareas pendientes (todo): ${open}`,
      `Fuente de verdad: command center sincronizado con supervisor.`
    ],
    recommendedCta: 'Te comparto un plan de 3 automatizaciones para bajar tu backlog esta semana.',
    sourceFiles: ['ops/command-center/tasks.json']
  };
}

function fallbackThread(index) {
  return {
    id: `thread-fallback-${index}`,
    type: 'investigation',
    title: `Thread operativo ${index}`,
    angle: 'Hilo de validacion operativa basado en datos internos.',
    hypothesis: 'Un mensaje con evidencia real supera copy generico.',
    evidence: ['Datos insuficientes para analisis profundo en este ciclo.'],
    recommendedCta: 'Solicita auditoria operativa para activar este hilo con datos reales.',
    sourceFiles: []
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  const events = safeReadJsonLines('ops/runtime/funnel-events.jsonl');
  const dashboard = safeReadJson('ops/runtime/dashboard-unified.json');
  const leadLog = safeReadJson('ops/traffic/lead-response-log.json');
  const tasks = safeReadJson('ops/command-center/tasks.json');

  const threads = [
    buildEventThread(events),
    buildCampaignThread(dashboard),
    buildLeadResponseThread(leadLog),
    buildTaskThread(tasks)
  ];

  while (threads.length < options.minThreads) {
    threads.push(fallbackThread(threads.length + 1));
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    minThreadsRequested: options.minThreads,
    threadCount: threads.length,
    threads
  };

  const outPath = path.resolve(options.outPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  process.stdout.write(`Research threads generated: ${outPath}\n`);
  process.stdout.write(`Threads: ${threads.length}\n`);
}

main();