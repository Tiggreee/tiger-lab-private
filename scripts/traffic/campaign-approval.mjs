#!/usr/bin/env node
/**
 * Campaign approval console — scripts/traffic/campaign-approval.mjs
 *
 * Explicit human gate over social publishing. Publishing to LinkedIn/X/etc is
 * irreversible (reputation, platform bans), so a human must say "go". Human
 * decisions live in a dedicated ledger (ops/runtime/campaign-approvals.json)
 * that is intentionally separate from the automated runtime index and the P20
 * alignment gate, so this tool never destabilizes those.
 *
 * Commands:
 *   --pending                    list campaigns awaiting a human decision
 *   --approve <id>               record approval and trigger the real publish
 *                                (delegates to engine/campaigns/approval-engine.mjs)
 *   --reject  <id> [reason...]   record rejection (never publishes)
 *   --expire  [--days N]         discard stale pending decisions (never publishes)
 *
 * Auto-expire only discards; it can never publish. That is the whole point:
 * unattended time defaults to "no", not "yes".
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const INDEX_PATH = path.resolve(ROOT, 'ops/runtime/campaigns/index.json');
const LEDGER_PATH = path.resolve(ROOT, 'ops/runtime/campaign-approvals.json');
const APPROVAL_ENGINE = path.resolve(ROOT, 'engine/campaigns/approval-engine.mjs');
const DEFAULT_EXPIRE_DAYS = 7;

function loadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function saveJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function loadLedger() {
  const ledger = loadJson(LEDGER_PATH, { updated: null, decisions: {} });
  if (!ledger.decisions || typeof ledger.decisions !== 'object') {
    ledger.decisions = {};
  }
  return ledger;
}

function saveLedger(ledger) {
  ledger.updated = new Date().toISOString();
  saveJson(LEDGER_PATH, ledger);
}

function listCampaigns() {
  const index = loadJson(INDEX_PATH, { campaigns: [] });
  return Array.isArray(index.campaigns) ? index.campaigns : [];
}

function decisionStatus(ledger, id) {
  return ledger.decisions[id]?.status || 'pending';
}

function ageDays(iso) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) {
    return Infinity;
  }
  return (Date.now() - time) / 86_400_000;
}

/**
 * Import terminal decisions the legacy index already recorded so the explicit
 * gate does not re-nag about campaigns the old flow already handled. Additive
 * only: never overwrites an existing ledger decision.
 */
function reconcileFromIndex(ledger) {
  let changed = false;
  for (const campaign of listCampaigns()) {
    if (ledger.decisions[campaign.id]) {
      continue;
    }
    const status = String(campaign.status || '').toLowerCase();
    if (status === 'approved' || status === 'published') {
      ledger.decisions[campaign.id] = {
        status: 'approved',
        at: campaign.approvedAt || campaign.createdAt || new Date().toISOString(),
        by: 'index-import',
        note: `Imported from runtime index (status=${status}).`
      };
      changed = true;
    } else if (status === 'rejected' || status === 'expired') {
      ledger.decisions[campaign.id] = {
        status,
        at: campaign.createdAt || new Date().toISOString(),
        by: 'index-import'
      };
      changed = true;
    }
  }
  return changed;
}

function pendingCampaigns(ledger) {
  return listCampaigns().filter((campaign) => decisionStatus(ledger, campaign.id) === 'pending');
}

function commandPending() {
  const ledger = loadLedger();
  if (reconcileFromIndex(ledger)) {
    saveLedger(ledger);
  }

  const pending = pendingCampaigns(ledger);
  if (pending.length === 0) {
    process.stdout.write('No campaigns awaiting human approval.\n');
    return 0;
  }

  process.stdout.write(`Campaigns awaiting human approval: ${pending.length}\n\n`);
  for (const campaign of pending) {
    const age = ageDays(campaign.createdAt);
    const ageLabel = Number.isFinite(age) ? `${age.toFixed(1)}d old` : 'age unknown';
    process.stdout.write(
      `  ${campaign.id}  score=${campaign.score ?? '?'}  ${ageLabel}  ${campaign.product || 'Unknown'}\n`
    );
  }
  process.stdout.write('\nApprove:  npm run campaigns:approve -- <id>\n');
  process.stdout.write('Reject:   npm run campaigns:reject -- <id> [reason]\n');
  process.stdout.write('Expire:   npm run campaigns:expire -- --days 7\n');
  return 0;
}

function commandApprove(id) {
  if (!id) {
    process.stderr.write('Usage: campaign-approval.mjs --approve <campaign-id>\n');
    return 1;
  }

  const known = listCampaigns().some((campaign) => campaign.id === id);
  if (!known) {
    process.stderr.write(`Campaign not found in runtime index: ${id}\n`);
    return 1;
  }

  process.stdout.write(`Approving ${id} — triggering real publish...\n`);
  const run = spawnSync(process.execPath, [APPROVAL_ENGINE, '--campaign', id], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8'
  });

  if (run.stdout) {
    process.stdout.write(run.stdout);
  }
  if (run.stderr) {
    process.stderr.write(run.stderr);
  }

  if (run.status !== 0) {
    process.stderr.write(`Publish failed for ${id}; decision NOT recorded.\n`);
    return run.status || 1;
  }

  const ledger = loadLedger();
  ledger.decisions[id] = {
    status: 'approved',
    at: new Date().toISOString(),
    by: 'human'
  };
  saveLedger(ledger);
  process.stdout.write(`Recorded approval for ${id}.\n`);
  return 0;
}

function commandReject(id, reasonParts) {
  if (!id) {
    process.stderr.write('Usage: campaign-approval.mjs --reject <campaign-id> [reason]\n');
    return 1;
  }

  const reason = reasonParts.join(' ').trim() || 'rejected by human';
  const ledger = loadLedger();
  ledger.decisions[id] = {
    status: 'rejected',
    at: new Date().toISOString(),
    by: 'human',
    note: reason
  };
  saveLedger(ledger);
  process.stdout.write(`Recorded rejection for ${id}: ${reason}\n`);
  return 0;
}

function commandExpire(days) {
  const ledger = loadLedger();
  reconcileFromIndex(ledger);

  const pending = pendingCampaigns(ledger);
  const expired = [];
  for (const campaign of pending) {
    if (ageDays(campaign.createdAt) > days) {
      ledger.decisions[campaign.id] = {
        status: 'expired',
        at: new Date().toISOString(),
        by: 'auto-expire',
        note: `No human approval within ${days} days; discarded, never published.`
      };
      expired.push(campaign.id);
    }
  }

  saveLedger(ledger);

  if (expired.length === 0) {
    process.stdout.write(`No pending campaigns older than ${days} days.\n`);
    return 0;
  }

  process.stdout.write(`Expired (discarded, never published) after ${days} days:\n`);
  for (const id of expired) {
    process.stdout.write(`  ${id}\n`);
  }
  return 0;
}

function parseDays(argv) {
  const flagIndex = argv.indexOf('--days');
  if (flagIndex === -1) {
    return DEFAULT_EXPIRE_DAYS;
  }
  const value = Number(argv[flagIndex + 1]);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_EXPIRE_DAYS;
}

function main(argv) {
  if (argv.includes('--pending')) {
    return commandPending();
  }
  if (argv.includes('--approve')) {
    return commandApprove(argv[argv.indexOf('--approve') + 1]);
  }
  if (argv.includes('--reject')) {
    const id = argv[argv.indexOf('--reject') + 1];
    const reasonParts = argv.slice(argv.indexOf('--reject') + 2).filter((part) => !part.startsWith('--'));
    return commandReject(id, reasonParts);
  }
  if (argv.includes('--expire')) {
    return commandExpire(parseDays(argv));
  }

  process.stdout.write('Campaign approval console\n\n');
  process.stdout.write('  --pending                 list campaigns awaiting human approval\n');
  process.stdout.write('  --approve <id>            approve and trigger the real publish\n');
  process.stdout.write('  --reject  <id> [reason]   reject (never publishes)\n');
  process.stdout.write('  --expire  [--days N]      discard stale pending (never publishes)\n');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}

export { pendingCampaigns, reconcileFromIndex, loadLedger };
