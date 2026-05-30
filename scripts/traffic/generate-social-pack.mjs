#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

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
    return `Escribe ACTIVAR por WhatsApp y te envio el plan hoy: ${closeLink}`;
  }

  if (options.closeChannel === 'calendar' && closeLink) {
    return `Agenda aqui tu diagnostico de 15 min: ${closeLink}`;
  }

  if (options.closeChannel === 'landing' && closeLink) {
    return `Activa aqui y te contacto en minutos: ${closeLink}`;
  }

  return 'Escribe ACTIVAR por DM y te envio el blueprint hoy.';
}

function buildCoreStructure(options) {
  const closeLink = buildCloseLink(options);
  const primaryCta = buildPrimaryCta(options, closeLink);

  const pain = `Si hoy estas publicando sin convertir, no te falta contenido: te falta sistema y seguimiento.`;
  const promise = `Con un flujo de 4 pasos puedes mover interes a llamada en el mismo dia para ${options.audience}.`;

  return {
    hookA: `${options.topic}.`,
    hookB: `Tu embudo no esta roto por falta de alcance, esta roto por falta de estructura.`,
    pain,
    promise,
    proof: 'Caso base: CTA unico + seguimiento en 4h = mas conversaciones calificadas.',
    ctaA: primaryCta,
    ctaB: 'Comenta ACTIVAR y te mando la version editable para que la ejecutes hoy.',
    closeLink
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

  return `${hook}\n\n${structure.pain}\n\n${structure.promise}\n\n${structure.proof}\n\nChecklist rapido:\n1. Publica valor con un solo CTA.\n2. Responde DMs en menos de 15 minutos.\n3. Haz seguimiento en 4 horas.\n4. Mide DM->Lead->Call.\n\n${cta}\n${link}\n\n#Monetizacion #Automatizacion #Growth`;
}

function formatX(structure, link, variant) {
  const hook = variant === 'A'
    ? 'Publicar mas no convierte mas.'
    : 'Tu embudo cae por falta de seguimiento, no por falta de alcance.';

  const cta = variant === 'A'
    ? 'DM ACTIVAR y te envio el blueprint 24h.'
    : 'Comenta ACTIVAR y te paso plantilla editable hoy.';

  const compact = `${hook} 1 CTA + seguimiento en 4h = mas leads calificados. ${cta} ${link}`;
  return fitToLimit(compact, CHAR_LIMITS.x);
}

function formatFacebook(structure, link, variant) {
  const hook = variant === 'A' ? structure.hookA : structure.hookB;
  const cta = variant === 'A' ? structure.ctaA : structure.ctaB;

  return `${hook}\n\n${structure.pain}\n\n${structure.promise}\n\nHoy solo necesitas una pieza de valor + un CTA unico + seguimiento temprano.\n\n${cta}\n${link}`;
}

function formatTelegram(structure, link, variant) {
  const hook = variant === 'A' ? structure.hookA : structure.hookB;
  const cta = variant === 'A' ? structure.ctaA : structure.ctaB;

  return `${hook}\n\n${structure.pain}\n\nPlan operativo de hoy:\n- Publica una pieza con CTA unico\n- Responde DMs en 15 minutos\n- Seguimiento en 4h\n- Cierre con llamada corta\n\n${cta}\n${link}`;
}

function formatDiscord(structure, link, variant) {
  const hook = variant === 'A' ? structure.hookA : structure.hookB;
  const cta = variant === 'A' ? structure.ctaA : structure.ctaB;

  return `${hook}\n${structure.pain}\n${structure.promise}\n${cta}\n${link}`;
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

function scoreCopy(text, channel) {
  const lower = text.toLowerCase();
  let score = 40;

  if (text.includes('http://') || text.includes('https://')) {
    score += 10;
  }

  if (countMatches(lower, [/\b(1\.|2\.|3\.|4\.)/, /checklist/, /plan operativo/]) > 0) {
    score += 12;
  }

  if (countMatches(lower, [/\b(hoy|24h|15 min|4 horas|15 minutos)\b/]) > 0) {
    score += 12;
  }

  if (countMatches(lower, [/activar/, /dm/, /comenta/]) > 0) {
    score += 12;
  }

  if (countMatches(lower, [/dolor/, /friccion/, /convierte|conversion|leads/]) > 0) {
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

  return Math.max(0, Math.min(100, score));
}

function estimateLift(score) {
  const baseline = 60;
  const delta = score - baseline;
  const projected = Math.round(delta * 0.6);
  return Math.max(0, Math.min(35, projected));
}

function selectBestVariant(channel, variantA, variantB) {
  const scoreA = scoreCopy(variantA, channel);
  const scoreB = scoreCopy(variantB, channel);

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
  const channels = {};

  for (const channel of CHANNELS) {
    const variantA = generateChannelVariant(channel, structure, options, 'A');
    const variantB = generateChannelVariant(channel, structure, options, 'B');
    const best = selectBestVariant(channel, variantA, variantB);

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

  const pack = buildPack(options);

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
