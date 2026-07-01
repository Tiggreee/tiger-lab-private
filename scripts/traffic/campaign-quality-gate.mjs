import { findGenericAIPatterns, scoreBrandSpecificity } from './content-quality-guard.mjs';

export const DEFAULT_QUALITY_THRESHOLD = 80;

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeBrand(brand = {}, fallbackProduct = '') {
  const productName = normalizeText(brand.productName || fallbackProduct);
  const domainTerms = Array.isArray(brand.domainTerms)
    ? brand.domainTerms.map((term) => normalizeText(term)).filter(Boolean)
    : [];

  return {
    productName,
    problemDetail: normalizeText(brand.problemDetail),
    primaryOutcome: normalizeText(brand.primaryOutcome),
    proofPoint: normalizeText(brand.proofPoint),
    domainTerms
  };
}

export function evaluateDraftQuality({
  campaignId,
  copies = {},
  brand = {},
  fallbackProduct = '',
  threshold = DEFAULT_QUALITY_THRESHOLD
}) {
  const normalizedBrand = normalizeBrand(brand, fallbackProduct);
  const channelReports = [];

  for (const [channel, copy] of Object.entries(copies)) {
    const text = String(copy || '');
    const matches = findGenericAIPatterns(text);
    const specificityScore = scoreBrandSpecificity(text, normalizedBrand);
    const reasons = [];

    if (matches.length > 0) {
      for (const match of matches) {
        reasons.push(match.reason);
      }
    }

    if (specificityScore < threshold) {
      reasons.push(`Specificity score ${specificityScore} below threshold ${threshold}.`);
    }

    channelReports.push({
      channel,
      specificityScore,
      genericPatterns: matches.map((item) => item.reason),
      passed: reasons.length === 0,
      reasons
    });
  }

  const failedChannels = channelReports.filter((item) => !item.passed);
  const averageSpecificity =
    channelReports.length > 0
      ? Math.round(channelReports.reduce((sum, item) => sum + item.specificityScore, 0) / channelReports.length)
      : 0;

  return {
    campaignId: normalizeText(campaignId),
    threshold,
    averageSpecificity,
    passed: failedChannels.length === 0,
    failedChannels: failedChannels.map((item) => item.channel),
    channels: channelReports
  };
}
