#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findGenericAIPatterns, scoreBrandSpecificity } from './traffic/content-quality-guard.mjs';

const CHANNELS = ['linkedin', 'x', 'facebook', 'telegram', 'discord'];
const PLACEHOLDER_PATTERNS = ['example.com', 'tu-landing-real.com'];
const PRODUCT_ALIASES = {
  facturautentico: ['facturaautentica', 'mcp-cfdi', 'mcp-leads', 'railway-ready'],
  'facturautentico-cloud': ['facturautentico-cloud', 'cloud'],
  'docflow-api': ['docflow-api', 'docflow api'],
  'script-premium-kit': ['script-premium-kit', 'script premium kit']
};

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const repoRoot = path.resolve(currentDir, '..');

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalize(value)
    .split(' ')
    .map((item) => item.trim())
    .filter((item) => item.length >= 3);
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function isPlaceholderLink(value) {
  const lower = String(value || '').trim().toLowerCase();
  if (!lower) {
    return true;
  }

  return PLACEHOLDER_PATTERNS.some((pattern) => lower.includes(pattern));
}

function scoreProductCampaignAffinity(product, pack) {
  const brandProductName = String(pack?.brand?.productName || '');
  const searchBlob = [
    brandProductName,
    pack?.campaign,
    pack?.topic,
    pack?.offer,
    pack?.funnel?.trafficDestination,
    pack?.funnel?.closeDestination,
    pack?.funnel?.closeLink
  ]
    .map((item) => String(item || ''))
    .join(' ');

  const haystack = normalize(searchBlob);
  const idTokens = tokenize(product.id);
  const nameTokens = tokenize(product.name);
  const requiredTokens = [...new Set([...idTokens, ...nameTokens])];

  const exactId = normalize(brandProductName) === normalize(product.id);
  const exactName = normalize(brandProductName) === normalize(product.name);
  const normalizedBrandName = normalize(brandProductName);
  const normalizedProductName = normalize(product.name);
  const normalizedProductId = normalize(product.id);
  const brandIsCloud = normalizedBrandName.includes('cloud');
  const productIsCloud = normalizedProductId.includes('cloud');

  const stemMatch = [normalizedProductName, normalizedProductId].some((candidate) => {
    if (!normalizedBrandName || !candidate) {
      return false;
    }

    const leftStem = normalizedBrandName.replace(/\s+/g, '').slice(0, 10);
    const rightStem = candidate.replace(/\s+/g, '').slice(0, 10);
    return leftStem.length >= 8 && rightStem.length >= 8 && leftStem === rightStem;
  });
  const tokenHits = requiredTokens.filter((token) => haystack.includes(token)).length;

  if (exactId || exactName) {
    return 100;
  }

  if (stemMatch && brandIsCloud === productIsCloud) {
    return 95;
  }

  if (requiredTokens.length === 0) {
    return 0;
  }

  const overlap = Math.round((tokenHits / requiredTokens.length) * 100);
  const campaignTag = normalize(pack?.campaign || '');
  const productId = normalize(product.id);
  const isCloudProduct = productId.includes('cloud');
  const isCloudCampaign = campaignTag.includes('cloud');

  let adjusted = overlap;

  if (isCloudCampaign && !isCloudProduct) {
    adjusted -= 25;
  }

  if (!isCloudCampaign && isCloudProduct) {
    adjusted -= 25;
  }

  const aliases = PRODUCT_ALIASES[product.id] || [];
  const aliasHit = aliases.some((alias) => haystack.includes(normalize(alias)));
  if (aliasHit) {
    adjusted += 60;
  }

  return Math.max(0, Math.min(99, adjusted));
}

function assessCampaignReadiness(pack) {
  const hasAllChannels = CHANNELS.every((channel) => Boolean(pack?.channels?.[channel]));

  const completeCopy = CHANNELS.every((channel) => {
    const payload = pack?.channels?.[channel];
    return Boolean(payload?.copyPaste && payload?.variants?.A && payload?.variants?.B);
  });

  const trafficDestination = String(pack?.funnel?.trafficDestination || '').trim();
  const closeChannel = String(pack?.funnel?.closeChannel || 'dm').trim().toLowerCase();
  const closeDestination = String(pack?.funnel?.closeDestination || '').trim();
  const closeLink = String(pack?.funnel?.closeLink || '').trim();

  const realLinks = !isPlaceholderLink(trafficDestination)
    && (closeChannel === 'dm' || Boolean(closeDestination))
    && (closeChannel === 'dm' || Boolean(closeLink));

  const qualityScore = Number(pack?.quality?.averageScore || 0);
  const scoreOk = qualityScore >= 72;

  return {
    hasAllChannels,
    completeCopy,
    realLinks,
    qualityScore,
    scoreOk,
    ready: hasAllChannels && completeCopy && realLinks && scoreOk
  };
}

function assessCampaignGenericness(pack, productName) {
  const baseBrand = {
    productName: productName || String(pack?.brand?.productName || ''),
    problemDetail: String(pack?.brand?.problemDetail || ''),
    primaryOutcome: String(pack?.brand?.primaryOutcome || ''),
    proofPoint: String(pack?.brand?.proofPoint || ''),
    domainTerms: Array.isArray(pack?.brand?.domainTerms) ? pack.brand.domainTerms : []
  };

  const detailsByChannel = {};
  let totalSpecificity = 0;
  let channelCount = 0;
  let lowSpecificityCount = 0;
  let genericPatternCount = 0;

  for (const channel of CHANNELS) {
    const copy = String(pack?.channels?.[channel]?.copyPaste || '');
    const specificity = copy ? scoreBrandSpecificity(copy, baseBrand) : 0;
    const genericPatterns = findGenericAIPatterns(copy).length;

    if (specificity < 45) {
      lowSpecificityCount += 1;
    }

    genericPatternCount += genericPatterns;
    totalSpecificity += specificity;
    channelCount += 1;

    detailsByChannel[channel] = {
      score: specificity,
      genericPatterns,
      hasCopy: Boolean(copy)
    };
  }

  const averageSpecificity = channelCount > 0 ? Math.round(totalSpecificity / channelCount) : 0;
  const generic = averageSpecificity < 45 || lowSpecificityCount >= 2 || genericPatternCount > 0;

  return {
    generic,
    averageSpecificity,
    lowSpecificityCount,
    genericPatternCount,
    detailsByChannel
  };
}

function findLinkedCampaigns(product, packs, outboxPath) {
  const matches = [];

  for (const entry of packs) {
    const affinity = scoreProductCampaignAffinity(product, entry.pack);
    if (affinity < 50) {
      continue;
    }

    const absolutePath = path.join(outboxPath, entry.file);
    const stat = fs.statSync(absolutePath);
    matches.push({
      campaign: entry.pack,
      file: entry.file,
      modifiedAt: new Date(stat.mtimeMs).toISOString(),
      affinity
    });
  }

  return matches.sort((left, right) => {
    if (right.affinity !== left.affinity) {
      return right.affinity - left.affinity;
    }

    const rightScore = Number(right.campaign?.quality?.averageScore || 0);
    const leftScore = Number(left.campaign?.quality?.averageScore || 0);
    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return right.modifiedAt.localeCompare(left.modifiedAt);
  });
}

function extractDefaultProvisionProductId() {
  const provisionScriptPath = path.join(repoRoot, 'scripts', 'provision-product.mjs');
  const source = fs.readFileSync(provisionScriptPath, 'utf8');
  const match = source.match(/const\s+productId\s*=\s*productIdArg\s*\|\|\s*'([^']+)'/);
  return match ? match[1] : '';
}

function loadSocialPacks(outboxPath) {
  const files = fs.readdirSync(outboxPath)
    .filter((name) => name.startsWith('social-pack-') && name.endsWith('.json'));

  return files.map((file) => ({
    file,
    pack: readJson(path.join(outboxPath, file), {})
  }));
}

function main() {
  const catalogPath = path.join(repoRoot, 'ops', 'catalog', 'products.json');
  const outboxPath = path.join(repoRoot, 'ops', 'traffic', 'outbox');
  const outputPath = path.join(repoRoot, 'ops', 'runtime', 'product-operability-report.json');

  const catalog = readJson(catalogPath, { products: [] });
  const activeProducts = (catalog.products || []).filter((product) => product.status === 'active');
  const packs = loadSocialPacks(outboxPath);

  const productResults = activeProducts.map((product) => {
    const linkedCampaigns = findLinkedCampaigns(product, packs, outboxPath);
    const selected = linkedCampaigns[0] || null;

    let selectedCampaign = null;
    let operableNow = false;
    const reasons = [];

    if (!selected) {
      reasons.push('No linked campaign found for this product.');
    } else {
      const readiness = assessCampaignReadiness(selected.campaign);
      const genericness = assessCampaignGenericness(selected.campaign, product.name);

      selectedCampaign = {
        campaign: selected.campaign.campaign || selected.file,
        file: path.join('ops', 'traffic', 'outbox', selected.file).replace(/\\/g, '/'),
        modifiedAt: selected.modifiedAt,
        affinity: selected.affinity,
        readiness,
        genericness
      };

      if (!readiness.ready) {
        reasons.push('Linked campaign is not launch-ready.');
      }

      if (genericness.generic) {
        reasons.push('Linked campaign copy still looks generic for this product.');
      }

      if (readiness.ready && !genericness.generic) {
        reasons.push('Product active, campaign generated, campaign ready, campaign non-generic.');
      }

      operableNow = readiness.ready && !genericness.generic;
    }

    return {
      productId: product.id,
      productName: product.name,
      planIds: Array.isArray(product.planIds) ? product.planIds : [],
      hasGeneratedCampaign: linkedCampaigns.length > 0,
      campaignCount: linkedCampaigns.length,
      selectedCampaign,
      operableNow,
      reasons
    };
  });

  const operableProducts = productResults.filter((item) => item.operableNow);
  const recommended = [...operableProducts].sort((left, right) => {
    const rightScore = Number(right.selectedCampaign?.readiness?.qualityScore || 0);
    const leftScore = Number(left.selectedCampaign?.readiness?.qualityScore || 0);
    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    const rightSpecificity = Number(right.selectedCampaign?.genericness?.averageSpecificity || 0);
    const leftSpecificity = Number(left.selectedCampaign?.genericness?.averageSpecificity || 0);
    return rightSpecificity - leftSpecificity;
  })[0];

  const report = {
    generatedAt: new Date().toISOString(),
    scope: 'product-operability',
    autoLaunchPolicy: {
      hasAutomaticProductLaunchFromProductionGate: false,
      reason: 'No code path links prod gate PASS to automatic product provisioning. Current automation selects campaign packs, not products.',
      campaignSelector: 'latest-social-pack-by-mtime',
      defaultProvisionProductId: extractDefaultProvisionProductId() || null
    },
    summary: {
      activeProducts: activeProducts.length,
      productsOperableNow: operableProducts.length,
      productsBlocked: activeProducts.length - operableProducts.length
    },
    products: productResults,
    recommendedNextAutoLaunchProduct: recommended ? recommended.productId : null
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  process.stdout.write(`Product operability report generated: ${outputPath}\n`);
  process.stdout.write(`Active products: ${report.summary.activeProducts}\n`);
  process.stdout.write(`Operable now: ${report.summary.productsOperableNow}\n`);
  process.stdout.write(`Blocked: ${report.summary.productsBlocked}\n`);
  process.stdout.write(
    `Recommended next auto-launch product: ${report.recommendedNextAutoLaunchProduct || 'none'}\n`
  );
}

main();
