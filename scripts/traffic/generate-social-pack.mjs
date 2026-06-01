#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { assertBrandInputs, assertPackAuthenticity, scoreBrandSpecificity } from './content-quality-guard.mjs';

const CHANNELS = ['linkedin', 'x', 'facebook', 'telegram', 'discord'];
const CHAR_LIMITS = {
  linkedin: 2800,
  x: 280,
  facebook: 63206,
  telegram: 4096,
  discord: 2000
};

function parseArgs(argv) {
  const options = {
    topic: 'Sistema autonomo para atraer leads con menos friccion operativa',
    audience: 'founders y operadores SMB',
    offer: 'diagnostico de 15 min con plan de activacion en 24h',
    campaign: `traffic-${new Date().toISOString().slice(0, 10)}`,
    baseLink: process.env.SOCIAL_DEFAULT_LINK || 'https://example.com',
    cta: process.env.SOCIAL_FINAL_CTA || '',
    closeChannel: process.env.SOCIAL_CLOSE_CHANNEL || 'dm',
    closeDestination: process.env.SOCIAL_CLOSE_DESTINATION || '',
    prefillMessage:
      process.env.SOCIAL_PREFILL_MESSAGE ||
      'Hola, vengo de la campana y quiero activar el diagnostico express de 15 min.',
    productName: process.env.SOCIAL_PRODUCT_NAME || '',
    problemDetail: process.env.SOCIAL_PROBLEM_DETAIL || '',
    primaryOutcome: process.env.SOCIAL_PRIMARY_OUTCOME || '',
    proofPoint: process.env.SOCIAL_PROOF_POINT || '',
    domainTerms: process.env.SOCIAL_DOMAIN_TERMS || '',
    outDir: 'ops/traffic/outbox'
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

    if (key in options) {
      options[key] = value;
      index += 1;
    }
  }

  return options;
}

function normalizeForTag(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isPlaceholderTrafficLink(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return normalized.includes('example.com') || normalized.includes('tu-landing-real.com');
}

function buildTrackedLink(baseLink, channel, campaign) {
  const url = new URL(baseLink);
  url.searchParams.set('utm_source', channel);
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set('utm_campaign', campaign);
  return url.toString();
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d]/g, '');
}

function buildCloseLink(options) {
  if (options.closeChannel === 'whatsapp') {
    const phone = normalizePhone(options.closeDestination);
    if (!phone) {
      return '';
    }

    const text = encodeURIComponent(options.prefillMessage);
    return `https://wa.me/${phone}?text=${text}`;
  }

  if (options.closeChannel === 'calendar' || options.closeChannel === 'landing') {
    if (!options.closeDestination) {
      return '';
    }

    return options.closeDestination;
  }

  return '';
}

function buildPrimaryCta(options, closeLink) {
  if (options.cta && options.cta.trim()) {
    return options.cta.trim();
  }

  if (options.closeChannel === 'whatsapp' && closeLink) {
    return `Si ${options.productName} encaja con tu operacion, escribeme por WhatsApp y revisamos tu caso real: ${closeLink}`;
  }

  if (options.closeChannel === 'calendar' && closeLink) {
    return `Agenda aqui un diagnostico de ${options.productName}: ${closeLink}`;
  }

  if (options.closeChannel === 'landing' && closeLink) {
    return `Revisa ${options.productName} aqui y te contacto con el siguiente paso: ${closeLink}`;
  }

  return `Si este problema ya te pega hoy, respondeme con tu caso y te digo si ${options.productName} encaja.`;
}

function buildCoreStructure(options) {
  const closeLink = buildCloseLink(options);
  const primaryCta = buildPrimaryCta(options, closeLink);
  const domainTerms = parseDomainTerms(options.domainTerms);

  const pain = `Si hoy ${options.audience} sigue resolviendo ${options.problemDetail}, el costo ya es operativo y visible.`;
  const promise = `${options.productName} esta hecho para ${options.primaryOutcome}.`;

  return {
    hookA: `${options.productName}: ${options.topic}.`,
    hookB: `${options.productName} no existe para sonar futurista. Existe para quitar ${options.problemDetail}.`,
    pain,
    promise,
    proof: options.proofPoint,
    domainTerms,
    operatorContext: `${options.audience} con foco en ${options.primaryOutcome}`,
    ctaA: primaryCta,
    ctaB: `Si tu equipo vive esto, respondeme con el cuello de botella exacto y te contesto con un caso concreto.`,
    closeLink
  };
}

function pickDomainTerms(domainTerms, count = 3) {
  if (!Array.isArray(domainTerms) || domainTerms.length === 0) {
    return '';
  }

  return domainTerms.slice(0, count).join(', ');
}

function buildFitSignal(structure) {
  const terms = pickDomainTerms(structure.domainTerms, 4);
  if (!terms) {
    return 'encaje operativo validable en una semana';
  }

  return terms;
}

function resolveVerticalAngle(structure) {
  const terms = Array.isArray(structure.domainTerms) ? structure.domainTerms.map((item) => item.toLowerCase()) : [];

  if (terms.some((term) => ['cfdi', 'timbrado', 'sat', 'pac', 'xml'].includes(term))) {
    return {
      focus: 'control fiscal, validacion previa y continuidad de timbrado',
      antiFit: 'equipos sin responsabilidad de cumplimiento CFDI'
    };
  }

  if (terms.some((term) => ['api', 'endpoint', 'workflow', 'integracion', 'trazabilidad'].includes(term))) {
    return {
      focus: 'estabilidad de endpoints, trazabilidad y menos errores de integracion',
      antiFit: 'equipos sin carga de integraciones documentales'
    };
  }

  if (terms.some((term) => ['scripts', 'runbook', 'automatizacion', 'ops', 'orquestacion'].includes(term))) {
    return {
      focus: 'runbooks ejecutables, menos tareas manuales y handoff ordenado',
      antiFit: 'equipos sin tareas repetitivas ni necesidad de estandarizar ejecucion'
    };
  }

  if (terms.some((term) => ['monetizacion', 'ingresos', 'validacion', 'experimentos', 'rutas'].includes(term))) {
    return {
      focus: 'validacion de ruta comercial, experimento corto y senal de ingreso real',
      antiFit: 'personas buscando teoria infinita sin experimentar en campo'
    };
  }

  return {
    focus: 'resultado operativo medible en menos ciclos de prueba',
    antiFit: 'equipos sin urgencia operativa en este trimestre'
  };
}

function fitToLimit(text, limit) {
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit - 3)}...`;
}

function formatLinkedIn(structure, link, variant) {
  const hook = variant === 'A' ? structure.hookA : structure.hookB;
  const cta = variant === 'A' ? structure.ctaA : structure.ctaB;
  const fitSignal = buildFitSignal(structure);
  const angle = resolveVerticalAngle(structure);

  return `${hook}\n\nContexto operativo: ${structure.operatorContext}.\n\n${structure.pain}\n\n${structure.promise}\n\nEnfoque de esta solucion: ${angle.focus}.\n\nPrueba concreta: ${structure.proof}\n\nSenales de encaje: ${fitSignal}.\n\nNo apto para: ${angle.antiFit}.\n\n${cta}\n${link}`;
}

function formatX(structure, link, variant) {
  const hook = variant === 'A'
    ? `${structure.hookA}`
    : `${structure.hookB}`;

  const cta = variant === 'A'
    ? structure.ctaA
    : structure.ctaB;

  const compact = `${hook} ${structure.pain} ${structure.proof} ${cta} ${link}`;
  return fitToLimit(compact, CHAR_LIMITS.x);
}

function formatFacebook(structure, link, variant) {
  const hook = variant === 'A' ? structure.hookA : structure.hookB;
  const cta = variant === 'A' ? structure.ctaA : structure.ctaB;
  const fitSignal = buildFitSignal(structure);
  const angle = resolveVerticalAngle(structure);

  return `${hook}\n\nEscenario real: ${structure.operatorContext}.\n\n${structure.pain}\n\n${structure.promise}\n\nFoco de implementacion: ${angle.focus}.\n\nPrueba concreta: ${structure.proof}\n\nChecklist de encaje: ${fitSignal}.\n\nNo apto para: ${angle.antiFit}.\n\n${cta}\n${link}`;
}

function formatTelegram(structure, link, variant) {
  const hook = variant === 'A' ? structure.hookA : structure.hookB;
  const cta = variant === 'A' ? structure.ctaA : structure.ctaB;
  const fitSignal = buildFitSignal(structure);
  const angle = resolveVerticalAngle(structure);

  return `${hook}\n\n${structure.pain}\n\n${structure.promise}\n\nFoco: ${angle.focus}.\n\nPrueba concreta: ${structure.proof}\n\nSenales de encaje: ${fitSignal}.\n\n${cta}\n${link}`;
}

function formatDiscord(structure, link, variant) {
  const hook = variant === 'A' ? structure.hookA : structure.hookB;
  const cta = variant === 'A' ? structure.ctaA : structure.ctaB;
  const fitSignal = buildFitSignal(structure);
  const angle = resolveVerticalAngle(structure);

  return `${hook}\n${structure.pain}\n${structure.promise}\nFoco: ${angle.focus}.\nPrueba concreta: ${structure.proof}\nSenales de encaje: ${fitSignal}.\n${cta}\n${link}`;
}

function generateChannelVariant(channel, structure, options, variant) {
  const link = buildTrackedLink(options.baseLink, channel, options.campaign);

  if (channel === 'linkedin') {
    return formatLinkedIn(structure, link, variant);
  }

  if (channel === 'x') {
    return formatX(structure, link, variant);
  }

  if (channel === 'facebook') {
    return formatFacebook(structure, link, variant);
  }

  if (channel === 'telegram') {
    return formatTelegram(structure, link, variant);
  }

  return formatDiscord(structure, link, variant);
}

function countMatches(text, patterns) {
  let count = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      count += 1;
    }
  }

  return count;
}

function parseDomainTerms(input) {
  return String(input || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function scoreCopy(text, channel, brand) {
  const lower = text.toLowerCase();
  let score = 20;

  score += scoreBrandSpecificity(text, brand);

  if (text.includes('http://') || text.includes('https://')) {
    score += 10;
  }

  if (countMatches(lower, [/prueba concreta/, /operacion/, /caso/, /diagnostico/]) > 0) {
    score += 8;
  }

  const limit = CHAR_LIMITS[channel];
  if (text.length <= limit) {
    score += 10;
  }

  if (text.length < 80) {
    score -= 8;
  }

  if (channel === 'x' && text.length > 260) {
    score -= 6;
  }

  if (countMatches(lower, [/blueprint/, /plantilla editable/, /comenta activar/, /dm activar/, /tu embudo no esta roto/]) > 0) {
    score -= 25;
  }

  return Math.max(0, Math.min(100, score));
}

function estimateLift(score) {
  const baseline = 60;
  const delta = score - baseline;
  const projected = Math.round(delta * 0.6);
  return Math.max(0, Math.min(35, projected));
}

function selectBestVariant(channel, variantA, variantB, brand) {
  const scoreA = scoreCopy(variantA, channel, brand);
  const scoreB = scoreCopy(variantB, channel, brand);

  if (scoreB > scoreA) {
    return {
      selected: 'B',
      text: variantB,
      score: scoreB,
      alternativeScore: scoreA
    };
  }

  return {
    selected: 'A',
    text: variantA,
    score: scoreA,
    alternativeScore: scoreB
  };
}

function buildPack(options) {
  const structure = buildCoreStructure(options);
  const brand = {
    productName: options.productName,
    problemDetail: options.problemDetail,
    primaryOutcome: options.primaryOutcome,
    proofPoint: options.proofPoint,
    domainTerms: parseDomainTerms(options.domainTerms)
  };
  const channels = {};

  for (const channel of CHANNELS) {
    const variantA = generateChannelVariant(channel, structure, options, 'A');
    const variantB = generateChannelVariant(channel, structure, options, 'B');
    const best = selectBestVariant(channel, variantA, variantB, brand);

    channels[channel] = {
      selectedVariant: best.selected,
      selectedScore: best.score,
      projectedLiftPct: estimateLift(best.score),
      copyPaste: best.text,
      variants: {
        A: variantA,
        B: variantB
      }
    };
  }

  const avgScore = Math.round(
    CHANNELS.reduce((acc, channel) => acc + channels[channel].selectedScore, 0) / CHANNELS.length
  );

  const avgLift = Math.round(
    CHANNELS.reduce((acc, channel) => acc + channels[channel].projectedLiftPct, 0) / CHANNELS.length
  );

  return {
    generatedAt: new Date().toISOString(),
    campaign: options.campaign,
    topic: options.topic,
    audience: options.audience,
    offer: options.offer,
    brand,
    funnel: {
      trafficDestination: options.baseLink,
      closeChannel: options.closeChannel,
      closeDestination: options.closeDestination || null,
      prefilledMessage: options.prefillMessage,
      finalCta: structure.ctaA,
      closeLink: structure.closeLink || null
    },
    quality: {
      averageScore: avgScore,
      projectedAverageLiftPct: avgLift,
      targetLiftPct: 15,
      targetReached: avgLift >= 15
    },
    channels
  };
}

function toMarkdown(pack) {
  const lines = [];
  lines.push(`# Social Pack - ${pack.campaign}`);
  lines.push('');
  lines.push(`Generated at: ${pack.generatedAt}`);
  lines.push(`Topic: ${pack.topic}`);
  lines.push(`Audience: ${pack.audience}`);
  lines.push(`Offer: ${pack.offer}`);
  lines.push(`Traffic destination: ${pack.funnel?.trafficDestination || '-'}`);
  lines.push(`Close channel: ${pack.funnel?.closeChannel || '-'}`);
  lines.push(`Close destination: ${pack.funnel?.closeDestination || '-'}`);
  lines.push(`Final CTA: ${pack.funnel?.finalCta || '-'}`);
  lines.push(`Prefilled message: ${pack.funnel?.prefilledMessage || '-'}`);
  lines.push(`Close link: ${pack.funnel?.closeLink || '-'}`);
  lines.push('');
  lines.push('## Quality summary');
  lines.push(`- Average score: ${pack.quality.averageScore}/100`);
  lines.push(`- Projected average lift: ${pack.quality.projectedAverageLiftPct}%`);
  lines.push(`- Target lift: ${pack.quality.targetLiftPct}%`);
  lines.push(`- Target reached: ${pack.quality.targetReached ? 'yes' : 'no'}`);
  lines.push('');

  for (const channel of CHANNELS) {
    const item = pack.channels[channel];
    lines.push(`## ${channel}`);
    lines.push(`- Selected variant: ${item.selectedVariant}`);
    lines.push(`- Selected score: ${item.selectedScore}/100`);
    lines.push(`- Projected lift: ${item.projectedLiftPct}%`);
    lines.push('');
    lines.push('Copy/paste selected:');
    lines.push('');
    lines.push(item.copyPaste);
    lines.push('');
    lines.push('Variant A:');
    lines.push('');
    lines.push(item.variants.A);
    lines.push('');
    lines.push('Variant B:');
    lines.push('');
    lines.push(item.variants.B);
    lines.push('');
  }

  return lines.join('\n');
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (isPlaceholderTrafficLink(options.baseLink)) {
    throw new Error(
      'baseLink is a placeholder. Set a real landing URL with --baseLink "https://your-real-landing.com" before generating a production pack.'
    );
  }

  assertBrandInputs(options);

  const pack = buildPack(options);
  assertPackAuthenticity(pack);

  const outDir = path.resolve(options.outDir);
  ensureDirectory(outDir);

  const safeCampaign = normalizeForTag(options.campaign);
  const jsonPath = path.join(outDir, `social-pack-${safeCampaign}.json`);
  const mdPath = path.join(outDir, `social-pack-${safeCampaign}.md`);

  fs.writeFileSync(jsonPath, `${JSON.stringify(pack, null, 2)}\n`);
  fs.writeFileSync(mdPath, `${toMarkdown(pack)}\n`);

  process.stdout.write('Social pack generated successfully.\n');
  process.stdout.write(`JSON: ${jsonPath}\n`);
  process.stdout.write(`Markdown: ${mdPath}\n`);
  process.stdout.write(
    `Projected average lift: ${pack.quality.projectedAverageLiftPct}% (target ${pack.quality.targetLiftPct}%)\n`
  );
}

main();
