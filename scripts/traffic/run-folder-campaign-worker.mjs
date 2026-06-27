import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { evaluateDraftQuality, DEFAULT_QUALITY_THRESHOLD } from './campaign-quality-gate.mjs';

const ROOT = process.cwd();
const CAMPAIGN_STATES_ROOT = path.resolve(ROOT, 'ops/campaigns');
const RUNTIME_CAMPAIGNS_ROOT = path.resolve(ROOT, 'ops/runtime/campaigns');

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

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
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
    threshold:
      Number.isFinite(Number(brief.qualityThreshold)) && Number(brief.qualityThreshold) > 0
        ? Number(brief.qualityThreshold)
        : DEFAULT_QUALITY_THRESHOLD
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
  ensureStages();
  const briefs = listInboxBriefs();
  const results = [];

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

  process.stdout.write(`Folder worker processed: ${summary.processed}\n`);
  process.stdout.write(`Approved: ${summary.approved}, Rejected: ${summary.rejected}, Errors: ${summary.errors}\n`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.once) {
    runOnce();
    return;
  }

  ensureStages();
  process.stdout.write('Folder worker watch mode started. Polling every 20 seconds.\n');

  runOnce();
  setInterval(runOnce, 20_000);
}

main();
