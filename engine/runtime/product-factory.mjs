#!/usr/bin/env node
/**
 * Product Factory — engine/runtime/product-factory.mjs
 *
 * Closes the product lifecycle loop end to end in a single command:
 *   1. Discovery   — rnd-engine scans and scores ideas (INVEST/ZOMBIE/KILL)
 *   2. Materialize — INVEST ideas become DRAFT catalog products
 *   3. Develop     — development engine scores every catalog product
 *   4. Improve     — product-improver closes documentation/integration gaps
 *   5. Verify      — product-api quality check on the live product layer
 *   6. QA gate     — production go/no-go gate validates the result
 *
 * Each stage runs in sequence; failures are recorded but do not silently pass.
 * The QA gate is the authoritative pass/fail for go-live readiness.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const REPORT_PATH = resolve('ops/runtime/product-factory-report.json');

const STAGES = [
  { id: 'discovery', name: 'Discovery (R&D scan)', cmd: 'node engine/rnd/rnd-engine.mjs --scan', gate: false },
  { id: 'materialize', name: 'Materialize INVEST ideas', cmd: 'node engine/rnd/idea-materializer.mjs', gate: false },
  { id: 'develop', name: 'Development scoring', cmd: 'node scripts/product-development-engine.mjs', gate: false },
  { id: 'improve', name: 'Auto-improve gaps', cmd: 'node engine/products/product-improver.mjs', gate: false },
  { id: 'verify', name: 'Product layer quality check', cmd: 'node engine/products/product-api.mjs --quality', gate: false },
  { id: 'qa-gate', name: 'QA production gate', cmd: 'node scripts/production-go-no-go.mjs', gate: true }
];

function run() {
  console.log('=== PRODUCT FACTORY (closed loop) ===\n');
  const results = [];
  let hardFail = false;

  for (const stage of STAGES) {
    process.stdout.write(`${stage.name}... `);
    const started = Date.now();
    let ok = true;
    let detail = '';
    try {
      execSync(stage.cmd, { stdio: 'pipe', timeout: 180000, cwd: process.cwd() });
      console.log('OK');
    } catch (e) {
      ok = false;
      detail = (e && e.message ? String(e.message) : 'unknown error').split('\n')[0];
      console.log('FAIL');
      if (stage.gate) hardFail = true;
    }
    results.push({ id: stage.id, name: stage.name, ok, gate: Boolean(stage.gate), ms: Date.now() - started, detail });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    stages: results,
    stagesOk: results.filter((r) => r.ok).length,
    stagesTotal: results.length,
    qaGatePassed: results.find((r) => r.id === 'qa-gate')?.ok === true,
    verdict: hardFail ? 'BLOCKED' : results.every((r) => r.ok) ? 'GREEN' : 'GREEN_WITH_WARNINGS'
  };

  mkdirSync(resolve('ops/runtime'), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(`\n=== VERDICT: ${report.verdict} ===`);
  console.log(`Stages OK: ${report.stagesOk}/${report.stagesTotal} | QA gate: ${report.qaGatePassed ? 'PASS' : 'FAIL'}`);
  console.log(`Report: ops/runtime/product-factory-report.json`);

  // Exit non-zero only when the authoritative QA gate fails.
  process.exit(hardFail ? 1 : 0);
}

run();
