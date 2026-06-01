#!/usr/bin/env node

const GENERIC_AI_PATTERNS = [
  {
    pattern: /\bblueprint\b/i,
    reason: 'Uses generic marketing jargon.'
  },
  {
    pattern: /\bplantilla editable\b/i,
    reason: 'Sounds like templated AI-marketing bait.'
  },
  {
    pattern: /tu embudo no esta roto/i,
    reason: 'Uses overfamiliar funnel-coach phrasing.'
  },
  {
    pattern: /escribe activar|comenta activar|dm activar/i,
    reason: 'Uses generic CTA bait instead of product-specific intent.'
  },
  {
    pattern: /flujo de 4 pasos/i,
    reason: 'Uses vague framework language with no product proof.'
  },
  {
    pattern: /sin codigo\. sin friccion\. sin limites\./i,
    reason: 'Reads like generic landing boilerplate.'
  }
]

function normalizeText(value) {
  return String(value || '').toLowerCase()
}

function tokenize(value) {
  return normalizeText(value)
    .split(/[^a-z0-9áéíóúñ]+/i)
    .map((item) => item.trim())
    .filter((item) => item.length >= 4)
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function findGenericAIPatterns(text) {
  return GENERIC_AI_PATTERNS.filter(({ pattern }) => pattern.test(String(text || '')))
}

export function scoreBrandSpecificity(text, metadata = {}) {
  const normalized = normalizeText(text)
  const productName = String(metadata.productName || '').trim()
  const problemDetail = String(metadata.problemDetail || '').trim()
  const proofPoint = String(metadata.proofPoint || '').trim()
  const primaryOutcome = String(metadata.primaryOutcome || '').trim()
  const domainTerms = Array.isArray(metadata.domainTerms) ? metadata.domainTerms : []

  let score = 0

  if (productName && normalized.includes(productName.toLowerCase())) {
    score += 28
  }

  if (primaryOutcome) {
    const matchedOutcomeTerms = tokenize(primaryOutcome).filter((term) => normalized.includes(term)).length
    score += Math.min(18, matchedOutcomeTerms * 6)
  }

  if (problemDetail) {
    const matchedProblemTerms = tokenize(problemDetail).filter((term) => normalized.includes(term)).length
    score += Math.min(20, matchedProblemTerms * 5)
  }

  if (proofPoint) {
    const hasProofDigits = /\d/.test(proofPoint) && /\d/.test(text)
    const matchedProofTerms = tokenize(proofPoint).filter((term) => normalized.includes(term)).length
    score += Math.min(20, matchedProofTerms * 4)
    if (hasProofDigits) {
      score += 8
    }
  }

  const matchedDomainTerms = domainTerms.filter((term) => normalized.includes(String(term).toLowerCase())).length
  score += Math.min(24, matchedDomainTerms * 6)

  for (const { pattern } of findGenericAIPatterns(text)) {
    if (pattern.test(text)) {
      score -= 18
    }
  }

  return Math.max(0, Math.min(100, score))
}

export function assertBrandInputs(options) {
  const missing = []

  if (!String(options.productName || '').trim()) {
    missing.push('productName')
  }

  if (!String(options.problemDetail || '').trim()) {
    missing.push('problemDetail')
  }

  if (!String(options.primaryOutcome || '').trim()) {
    missing.push('primaryOutcome')
  }

  if (!String(options.proofPoint || '').trim()) {
    missing.push('proofPoint')
  }

  if (missing.length > 0) {
    throw new Error(`Brand-specific pack blocked: missing required inputs ${missing.join(', ')}.`)
  }
}

export function assertPackAuthenticity(pack) {
  const brand = pack?.brand || {}
  const selectedCopies = Object.values(pack?.channels || {}).map((item) => item?.copyPaste || '')
  const productRegex = brand.productName ? new RegExp(`\\b${escapeRegExp(brand.productName)}\\b`, 'i') : null
  const productMentionCount = productRegex
    ? selectedCopies.filter((text) => productRegex.test(text)).length
    : 0

  if (productMentionCount < Math.max(2, Math.ceil(selectedCopies.length / 2))) {
    throw new Error('Pack authenticity blocked: selected copies do not mention the product often enough.')
  }

  const domainTerms = Array.isArray(brand.domainTerms) ? brand.domainTerms : []
  const domainHits = selectedCopies.reduce((accumulator, text) => {
    return accumulator + domainTerms.filter((term) => normalizeText(text).includes(String(term).toLowerCase())).length
  }, 0)

  if (domainTerms.length > 0 && domainHits < Math.max(2, domainTerms.length)) {
    throw new Error('Pack authenticity blocked: selected copies lack domain-specific language.')
  }

  for (const [channel, item] of Object.entries(pack?.channels || {})) {
    const genericMatches = findGenericAIPatterns(item?.copyPaste || '')
    if (genericMatches.length > 0) {
      const reasons = genericMatches.map((match) => match.reason).join(' ')
      throw new Error(`Pack authenticity blocked on ${channel}: ${reasons}`)
    }

    const specificityScore = scoreBrandSpecificity(item?.copyPaste || '', brand)
    if (specificityScore < 45) {
      throw new Error(`Pack authenticity blocked on ${channel}: specificity score ${specificityScore} is too low.`)
    }
  }
}