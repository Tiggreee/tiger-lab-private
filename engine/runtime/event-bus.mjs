#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const STATE_PATH = resolve('ops/runtime/event-bus-state.json');
const SUBS_PATH = resolve('ops/runtime/event-bus-subscribers.json');

const GUARDRAILS = {
  MAX_EVENTS: 1000,
  MAX_EVENT_AGE_HOURS: 24,
  MAX_CONSECUTIVE_FAILURES: 5
};

function loadState() {
  try { return JSON.parse(readFileSync(STATE_PATH, 'utf8')); } catch { return { events: [], nextId: 1, failures: {} }; }
}

function saveState(state) {
  mkdirSync(resolve('ops/runtime'), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function loadSubscribers() {
  try { return JSON.parse(readFileSync(SUBS_PATH, 'utf8')); } catch { return {}; }
}

function saveSubscribers(subs) {
  mkdirSync(resolve('ops/runtime'), { recursive: true });
  writeFileSync(SUBS_PATH, JSON.stringify(subs, null, 2), 'utf8');
}

export function emit(eventType, payload = {}) {
  const state = loadState();

  if (state.events.length >= GUARDRAILS.MAX_EVENTS) {
    const cutoff = Date.now() - (GUARDRAILS.MAX_EVENT_AGE_HOURS * 60 * 60 * 1000);
    state.events = state.events.filter(e => new Date(e.timestamp).getTime() > cutoff);
    if (state.events.length >= GUARDRAILS.MAX_EVENTS) {
      state.events = state.events.slice(-Math.floor(GUARDRAILS.MAX_EVENTS * 0.8));
    }
  }

  const event = {
    id: state.nextId,
    type: eventType,
    payload,
    timestamp: new Date().toISOString(),
    consumed: []
  };
  state.events.push(event);
  state.nextId++;
  saveState(state);
  return event;
}

export function recordFailure(subscriberName, eventType) {
  const state = loadState();
  if (!state.failures) state.failures = {};
  if (!state.failures[subscriberName]) state.failures[subscriberName] = {};
  if (!state.failures[subscriberName][eventType]) state.failures[subscriberName][eventType] = 0;
  state.failures[subscriberName][eventType]++;
  saveState(state);
  return state.failures[subscriberName][eventType];
}

export function resetFailures(subscriberName, eventType) {
  const state = loadState();
  if (state.failures?.[subscriberName]?.[eventType]) {
    state.failures[subscriberName][eventType] = 0;
    saveState(state);
  }
}

export function isBlocked(subscriberName, eventType) {
  const state = loadState();
  const failures = state.failures?.[subscriberName]?.[eventType] || 0;
  return failures >= GUARDRAILS.MAX_CONSECUTIVE_FAILURES;
}

export function subscribe(eventType, subscriberName) {
  const subs = loadSubscribers();
  if (!subs[eventType]) subs[eventType] = [];
  if (!subs[eventType].includes(subscriberName)) {
    subs[eventType].push(subscriberName);
  }
  saveSubscribers(subs);
  return { subscribed: true, eventType, subscriberName };
}

export function getPending(subscriberName) {
  const state = loadState();
  const subs = loadSubscribers();
  const pending = [];
  for (const event of state.events) {
    const interested = Object.entries(subs)
      .filter(([type, names]) => type === event.type && names.includes(subscriberName))
      .length > 0;
    if (interested && !event.consumed.includes(subscriberName)) {
      if (!isBlocked(subscriberName, event.type)) {
        pending.push(event);
      }
    }
  }
  return pending;
}

export function consume(eventId, subscriberName) {
  const state = loadState();
  const event = state.events.find(e => e.id === eventId);
  if (event && !event.consumed.includes(subscriberName)) {
    event.consumed.push(subscriberName);
    saveState(state);
  }
  return event || null;
}

export function getHistory(eventType, limit = 50) {
  const state = loadState();
  return state.events
    .filter(e => !eventType || e.type === eventType)
    .slice(-limit);
}

export function clear() {
  saveState({ events: [], nextId: 1 });
  return { cleared: true };
}

export function stats() {
  const state = loadState();
  const subs = loadSubscribers();
  const byType = {};
  for (const e of state.events) {
    byType[e.type] = (byType[e.type] || 0) + 1;
  }
  return {
    totalEvents: state.events.length,
    byType,
    subscriberCount: Object.values(subs).reduce((a, b) => a + b.length, 0),
    subscribers: subs,
    failures: state.failures || {},
    guardrails: GUARDRAILS
  };
}

const args = process.argv.slice(2);

if (args.includes('--emit')) {
  const idx = args.indexOf('--emit');
  const type = args[idx + 1];
  const payload = args[idx + 2] ? JSON.parse(args[idx + 2]) : {};
  const event = emit(type, payload);
  console.log(JSON.stringify(event, null, 2));
} else if (args.includes('--subscribe')) {
  const idx = args.indexOf('--subscribe');
  const type = args[idx + 1];
  const name = args[idx + 2];
  console.log(JSON.stringify(subscribe(type, name), null, 2));
} else if (args.includes('--pending')) {
  const name = args[args.indexOf('--pending') + 1];
  console.log(JSON.stringify(getPending(name), null, 2));
} else if (args.includes('--consume')) {
  const idx = args.indexOf('--consume');
  const id = parseInt(args[idx + 1]);
  const name = args[idx + 2];
  console.log(JSON.stringify(consume(id, name), null, 2));
} else if (args.includes('--history')) {
  const type = args[args.indexOf('--history') + 1];
  console.log(JSON.stringify(getHistory(type === '--' ? null : type), null, 2));
} else if (args.includes('--stats')) {
  console.log(JSON.stringify(stats(), null, 2));
} else if (args.includes('--clear')) {
  console.log(JSON.stringify(clear(), null, 2));
} else {
  console.log('Event Bus — pub/sub with SQLite persistence');
  console.log('  --emit <type> [json]     Emit event');
  console.log('  --subscribe <type> <name> Register subscriber');
  console.log('  --pending <name>         Get unconsumed events');
  console.log('  --consume <id> <name>    Mark event consumed');
  console.log('  --history [type]         Show event history');
  console.log('  --stats                  Show bus statistics');
  console.log('  --clear                  Clear all events');
}
