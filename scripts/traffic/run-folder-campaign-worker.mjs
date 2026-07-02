import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { evaluateDraftQuality, DEFAULT_QUALITY_THRESHOLD } from './campaign-quality-gate.mjs';
import { syncRuntimeCampaignIndex } from './sync-runtime-campaign-index.mjs';

const ROOT = process.cwd();
const CAMPAIGN_STATES_ROOT = path.resolve(ROOT, 'ops/campaigns');
const RUNTIME_CAMPAIGNS_ROOT = path.resolve(ROOT, 'ops/runtime/campaigns');
const WORKER_LOCK_PATH = path.join(CAMPAIGN_STATES_ROOT, '.folder-worker.lock');
const PRODUCTS_CATALOG_PATH = path.resolve(ROOT, 'ops/catalog/products.json');

let runInProgress = false;

const STAGES = {
  inbox: path.join(CAMPAIGN_STATES_ROOT, '00-inbox'),
  research: path.join(CAMPAIGN_STATES_ROOT, '10-research'),
  draft: path.join(CAMPAIGN_STATES_ROOT, '20-draft'),
  quality: path.join(CAMPAIGN_STATES_ROOT, '30-quality'),
  approved: path.join(CAMPAIGN_STATES_ROOT, '40-approved'),
  published: path.join(CAMPAIGN_STATES_ROOT, '50-published'),
  rejected: path.join(CAMPAIGN_STATES_ROOT, '99-rejected')
};

function ensureStages() {
  for (const stagePath of Object.values(STAGES)) {
    fs.mkdirSync(stagePath, { recursive: true });
  }
}

function listInboxBriefs() {
  const entries = fs.readdirSync(STAGES.inbox, { withFileTypes: true });
  return entries
    .filter((item) => item.isFile() && item.name.endsWith('.json'))
    .map((item) => path.join(STAGES.inbox, item.name));
}

function listProcessedBriefIds() {
  const ids = new Set();
  for (const stagePath of [STAGES.inbox, STAGES.research, STAGES.approved, STAGES.rejected]) {
    const entries = fs.readdirSync(stagePath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      ids.add(path.basename(entry.name, '.json'));
    }
  }
  return ids;
}

function inferCampaignContext(product) {
  const productName = String(product?.name || 'Producto').toLowerCase();
  if (productName.includes('docflow') || productName.includes('factur')) {
    return {
      target: 'contabilidad',
      segment: 'contabilidad',
      problemDetail: 'captura manual de XML CFDI y reconciliacion de cobros en procesos operativos',
      primaryOutcome: 'automatizacion de flujo documental con evidencia fiscal y trazabilidad diaria',
      proofPoint: 'operacion productiva con dashboard en linea, reconciliacion MATCH y gate GO',
      domainTerms: ['cfdi', 'xml', 'timbrado', 'uuid', 'reconciliacion', 'sat', 'pac'],
      qualityThreshold: 45
    };
  }

  return {
    target: 'operaciones',
    segment: 'pymes',
    problemDetail: 'procesos manuales y repetitivos en operacion comercial sin trazabilidad',
    primaryOutcome: 'automatizacion operativa con ejecucion diaria y seguimiento en dashboard',
    proofPoint: 'pipeline y command center funcionando en produccion',
    domainTerms: ['automatizacion', 'operaciones', 'pipeline', 'dashboard', 'conversion'],
    qualityThreshold: 45
  };
}

function seedInboxFromActiveProducts() {
  if (!fs.existsSync(PRODUCTS_CATALOG_PATH)) {
    return 0;
  }

  const catalog = loadJson(PRODUCTS_CATALOG_PATH);
  const products = Array.isArray(catalog?.products) ? catalog.products : [];
  const active = products.filter((product) => String(product?.status || '').toLowerCase() === 'active');
  const processedIds = listProcessedBriefIds();
  const today = new Date().toISOString().slice(0, 10);

  let created = 0;
  for (const product of active) {
    const productId = String(product?.id || '').trim();
    const productName = String(product?.name || '').trim();
    if (!productId || !productName || productId === 'dryrun') {
      continue;
    }

    const briefId = `auto-${productId}-${today}`;
    if (processedIds.has(briefId)) {
      continue;
    }

    const context = inferCampaignContext(product);
    saveJson(path.join(STAGES.inbox, `${briefId}.json`), {
      id: briefId,
      productName,
      target: context.target,
      segment: context.segment,
      problemDetail: context.problemDetail,
      primaryOutcome: context.primaryOutcome,
      proofPoint: context.proofPoint,
      domainTerms: context.domainTerms,
      qualityThreshold: context.qualityThreshold
    });
    created += 1;
  }

  return created;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function acquireWorkerLock() {
  try {
    const fd = fs.openSync(WORKER_LOCK_PATH, 'wx');
    fs.writeFileSync(fd, `${process.pid}\n`, 'utf8');
    return fd;
  } catch (error) {
    if (error && error.code === 'EEXIST') {
      return null;
    }
    throw error;
  }
}

function releaseWorkerLock(fd) {
  try {
    if (typeof fd === 'number') {
      fs.closeSync(fd);
    }
  } catch {
    // Best effort close.
  }

  try {
    fs.rmSync(WORKER_LOCK_PATH, { force: true });
  } catch {
    // Best effort cleanup.
  }
}

function resolveBriefId(briefPath, brief) {
  if (typeof brief.id === 'string' && brief.id.trim()) {
    return brief.id.trim();
  }
  const base = path.basename(briefPath, '.json').toLowerCase();
  return base.replace(/[^a-z0-9-]+/g, '-');
}

function copyFileIntoStage(sourcePath, destinationStagePath, destinationName) {
  fs.mkdirSync(destinationStagePath, { recursive: true });
  const destinationPath = path.join(destinationStagePath, destinationName);
  fs.copyFileSync(sourcePath, destinationPath);
  return destinationPath;
}

function runCreativeAgent(brief) {
  const product = String(brief.productName || 'Docflow API');
  const target = String(brief.target || brief.segment || 'contabilidad');
  const segment = String(brief.segment || 'contabilidad');

  const run = spawnSync(
    process.execPath,
    ['engine/campaigns/creative-agent.mjs', '--create', '--product', product, '--target', target, '--segment', segment],
    {
      cwd: ROOT,
      env: process.env,
      encoding: 'utf8'
    }
  );

  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  if (run.status !== 0) {
    throw new Error(`creative-agent failed: ${output}`);
  }

  const match = output.match(/Campaign:\s*(CAMP-\d+)/i);
  if (match?.[1]) {
    return match[1];
  }

  const latest = fs
    .readdirSync(RUNTIME_CAMPAIGNS_ROOT, { withFileTypes: true })
    .filter((item) => item.isDirectory() && /^CAMP-\d+$/.test(item.name))
    .map((item) => item.name)
    .sort()
    .at(-1);

  if (!latest) {
    throw new Error('Unable to determine latest campaign id from creative-agent output.');
  }

  return latest;
}

function buildDraftSnapshot(campaignId, briefId) {
  const campaignDir = path.join(RUNTIME_CAMPAIGNS_ROOT, campaignId);
  const campaignFile = path.join(campaignDir, 'campaign.json');
  const analysisFile = path.join(campaignDir, 'analysis.json');
  const scorecardFile = path.join(campaignDir, 'scorecard.json');

  const campaign = loadJson(campaignFile);
  const snapshot = {
    briefId,
    campaignId,
    capturedAt: new Date().toISOString(),
    campaign,
    analysis: fs.existsSync(analysisFile) ? loadJson(analysisFile) : null,
    scorecard: fs.existsSync(scorecardFile) ? loadJson(scorecardFile) : null
  };

  const snapshotDir = path.join(STAGES.draft, briefId);
  saveJson(path.join(snapshotDir, 'draft.json'), snapshot);
  return snapshot;
}

function buildQualityInput(brief, snapshot) {
  const briefThreshold = Number(brief.qualityThreshold);
  const threshold = Number.isFinite(briefThreshold) ? briefThreshold : DEFAULT_QUALITY_THRESHOLD;

  return {
    campaignId: snapshot.campaignId,
    copies: snapshot.campaign?.copies || {},
    brand: {
      productName: brief.productName || snapshot.campaign?.product,
      problemDetail: brief.problemDetail,
      primaryOutcome: brief.primaryOutcome,
      proofPoint: brief.proofPoint,
      domainTerms: brief.domainTerms
    },
    fallbackProduct: snapshot.campaign?.product || 'Docflow API',
    threshold
  };
}

function processBrief(briefPath) {
  const brief = loadJson(briefPath);
  const briefId = resolveBriefId(briefPath, brief);
  const processedName = `${briefId}.json`;
  const approvedPath = path.join(STAGES.approved, processedName);
  const rejectedPath = path.join(STAGES.rejected, processedName);

  if (fs.existsSync(approvedPath) || fs.existsSync(rejectedPath)) {
    return { briefId, status: 'skipped', reason: 'already-processed' };
  }

  copyFileIntoStage(briefPath, STAGES.research, processedName);

  const campaignId = runCreativeAgent(brief);
  const snapshot = buildDraftSnapshot(campaignId, briefId);
  const qualityInput = buildQualityInput(brief, snapshot);
  const qualityResult = evaluateDraftQuality(qualityInput);

  saveJson(path.join(STAGES.quality, `${briefId}.json`), {
    checkedAt: new Date().toISOString(),
    briefId,
    campaignId,
    qualityResult
  });

  const finalPayload = {
    finalizedAt: new Date().toISOString(),
    briefId,
    campaignId,
    qualityResult,
    brief
  };

  if (qualityResult.passed) {
    saveJson(approvedPath, finalPayload);
    saveJson(path.join(STAGES.published, processedName), finalPayload);
    fs.rmSync(briefPath);
    return { briefId, status: 'approved', campaignId };
  }

  saveJson(rejectedPath, finalPayload);
  fs.rmSync(briefPath);
  return { briefId, status: 'rejected', campaignId, failedChannels: qualityResult.failedChannels };
}

function parseArgs(argv) {
  const options = { once: true };
  for (const arg of argv) {
    if (arg === '--watch') {
      options.once = false;
    }
  }
  return options;
}

function runOnce() {
  if (runInProgress) {
    process.stdout.write('Folder worker skipped: in-process run still active.\n');
    return null;
  }

  runInProgress = true;
  const lockFd = acquireWorkerLock();
  if (lockFd === null) {
    process.stdout.write('Folder worker skipped: lock exists from another process.\n');
    runInProgress = false;
    return null;
  }

  ensureStages();
  const results = [];

  try {
    let briefs = listInboxBriefs();
    if (briefs.length === 0) {
      const created = seedInboxFromActiveProducts();
      if (created > 0) {
        process.stdout.write(`Auto-seeded inbox briefs: ${created}\n`);
      }
      briefs = listInboxBriefs();
    }

    for (const briefPath of briefs) {
      try {
        results.push(processBrief(briefPath));
      } catch (error) {
        results.push({
          briefId: path.basename(briefPath, '.json'),
          status: 'error',
          error: String(error?.message || error)
        });
      }
    }

    const summary = {
      runAt: new Date().toISOString(),
      processed: results.length,
      approved: results.filter((item) => item.status === 'approved').length,
      rejected: results.filter((item) => item.status === 'rejected').length,
      skipped: results.filter((item) => item.status === 'skipped').length,
      errors: results.filter((item) => item.status === 'error').length,
      results
    };

    saveJson(path.join(CAMPAIGN_STATES_ROOT, 'worker-last-run.json'), summary);
    syncRuntimeCampaignIndex();

    process.stdout.write(`Folder worker processed: ${summary.processed}\n`);
    process.stdout.write(`Approved: ${summary.approved}, Rejected: ${summary.rejected}, Errors: ${summary.errors}\n`);
    return summary;
  } finally {
    releaseWorkerLock(lockFd);
    runInProgress = false;
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.once) {
    runOnce();
    return;
  }

  ensureStages();
  process.stdout.write('Folder worker watch mode started. Polling every 20 seconds.\n');

  // Safety: watch mode auto-stops once there is no genuine new work to act on,
  // so an unattended worker can never fly forever generating noise. Only real
  // outcomes (approved/rejected/errors) reset the idle counter; skips do not.
  const MAX_IDLE_CYCLES = 3;
  let idleCycles = 0;
  let timer;

  const tick = () => {
    const summary = runOnce();
    const didWork =
      Boolean(summary) &&
      ((summary.approved || 0) + (summary.rejected || 0) + (summary.errors || 0)) > 0;
    idleCycles = didWork ? 0 : idleCycles + 1;
    if (idleCycles >= MAX_IDLE_CYCLES) {
      process.stdout.write(
        `Folder worker auto-stopping: ${MAX_IDLE_CYCLES} idle cycles, no new campaigns to act on.\n`
      );
      if (timer) {
        clearInterval(timer);
      }
      process.exit(0);
    }
  };

  tick();
  timer = setInterval(tick, 20_000);
}

main();
