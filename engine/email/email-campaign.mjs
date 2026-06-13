#!/usr/bin/env node
/**
 * Email Campaign Engine — engine/email/email-campaign.mjs
 * CORE ENGINE. Zero GitHub dependency. Portable.
 * 
 * Generates email campaigns adapted per social network/channel.
 * Each campaign includes: HTML template, AI-generated images, prospect list, metrics tracking.
 * 
 * FLOW: campaign-designer (approval) → email-campaign (build) → campaign-router (send)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;

function buildEmailTemplate(prospect, campaignConfig) {
  const { productName, offer, companyName } = campaignConfig;
  const headerColor = campaignConfig.colors?.header || '#6C47FF';
  const accentColor = campaignConfig.colors?.accent || '#FF6B35';
  
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F3FF;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(108,71,255,0.1);">
    <tr>
      <td style="background:${headerColor};padding:40px 30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">${productName}</h1>
        <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px;">${campaignConfig.headline || 'Automatización inteligente para tu empresa'}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px;">
        <img src="${campaignConfig.imageUrl || ''}" alt="${productName}" style="width:100%;max-width:100%;border-radius:8px;display:block;" />
      </td>
    </tr>
    <tr>
      <td style="padding:30px;">
        <p style="color:#333;font-size:16px;line-height:1.6;">Hola <strong>${prospect.name}</strong>,</p>
        <p style="color:#333;font-size:16px;line-height:1.6;">${campaignConfig.bodyCopy || ''}</p>
        <div style="background:#F5F3FF;border-radius:8px;padding:20px;margin:20px 0;">
          <p style="color:#333;font-size:15px;margin:0;"><strong>Lo que ofrecemos:</strong></p>
          <ul style="color:#555;font-size:14px;padding-left:20px;margin:10px 0 0;">
            ${(campaignConfig.bullets || []).map(b => `<li>${b}</li>`).join('\n            ')}
          </ul>
        </div>
        <div style="text-align:center;margin:30px 0;">
          <a href="${campaignConfig.ctaUrl || '#'}" style="display:inline-block;background:${accentColor};color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:bold;">${campaignConfig.ctaText || 'Agenda tu diagnóstico'}</a>
        </div>
        <p style="color:#777;font-size:13px;text-align:center;margin-top:20px;">© 2026 ${companyName || 'Tiger Lab'}. Todos los derechos reservados.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateImagePlaceholder(campaignConfig, prospect) {
  const { productName, headline } = campaignConfig;
  return {
    url: campaignConfig.imageUrl || `https://via.placeholder.com/${CANVAS_WIDTH}x${CANVAS_HEIGHT}/${campaignConfig.colors?.header?.replace('#','') || '6C47FF'}/ffffff?text=${encodeURIComponent(productName)}`,
    alt: `${productName} - ${headline || ''}`,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    generatedAt: new Date().toISOString()
  };
}

function adaptForChannel(campaign, channel) {
  const adapters = {
    email: (c) => ({
      ...c,
      channel: 'email',
      subject: `${c.productName} — ${c.headline}`,
      format: 'html'
    }),
    linkedin: (c) => ({
      ...c,
      channel: 'linkedin',
      format: 'text',
      bodyCopy: c.headline + '\n\n' + c.bodyCopy + '\n\n' + c.ctaText + ': ' + c.ctaUrl
    }),
    facebook: (c) => ({
      ...c,
      channel: 'facebook',
      format: 'text',
      bodyCopy: c.headline + '\n\n' + c.bodyCopy.substring(0, 200) + '...\n\n' + c.ctaUrl
    })
  };
  
  return (adapters[channel] || adapters.email)(JSON.parse(JSON.stringify(campaign)));
}

function generateCampaign(campaignConfig, prospects, options = {}) {
  const { channels = ['email'] } = options;
  
  const campaign = {
    id: `CAMP-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    config: campaignConfig,
    channels: {},
    prospects: prospects.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email || `lead@${p.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      industry: p.industry,
      city: p.city
    })),
    metrics: { totalProspects: prospects.length }
  };
  
  for (const channel of channels) {
    const adapted = adaptForChannel(campaignConfig, channel);
    campaign.channels[channel] = {
      template: buildEmailTemplate(prospects[0], campaignConfig),
      image: generateImagePlaceholder(campaignConfig, prospects[0]),
      config: adapted,
      prospectCount: prospects.length
    };
  }
  
  return campaign;
}

function generateSampleCampaign(productName = 'Docflow API') {
  return {
    productName,
    headline: 'Deja de perder 10h/semana en papeleo — automatiza hoy',
    bodyCopy: 'Sabemos que tu tiempo vale. Cada hora que pasas gestionando documentos, facturas y procesos manuales es una hora que podrías invertir en hacer crecer tu negocio. Nuestra solución automatiza todo ese flujo para que tú te concentres en lo que importa.',
    bullets: [
      'Automatización completa de documentos y flujos de trabajo',
      'Integración con tu stack actual en minutos, no meses',
      'Soporte MX con facturación electrónica CFDI nativa',
      '15 min de diagnóstico gratis para tu empresa'
    ],
    ctaText: 'Agenda tu diagnóstico gratis (15 min)',
    ctaUrl: 'https://cal.com/victor-tigerlab/diagnostic',
    companyName: 'Tiger Lab',
    colors: { header: '#6C47FF', accent: '#FF6B35' },
    offer: 'Diagnóstico gratuito',
    imageUrl: ''
  };
}

function main() {
  const args = process.argv.slice(2);
  const product = args.find(a => !a.startsWith('--')) || 'docflow';
  const dryRun = args.includes('--dry-run');
  const channels = args.includes('--channels') 
    ? args[args.indexOf('--channels') + 1].split(',') 
    : ['email'];
  
  const outDir = 'ops/runtime';
  mkdirSync(outDir, { recursive: true });
  
  const products = { docflow: 'Docflow API', scriptkit: 'Script Premium Kit', facturacion: 'FacturAutentico' };
  const productName = products[product] || product;
  
  const campaignConfig = generateSampleCampaign(productName);
  
  let prospects;
  try {
    const f = resolve(outDir, `campaign-prospects-${product === 'facturacion' ? 'facturacion' : 'general'}.json`);
    prospects = JSON.parse(readFileSync(f, 'utf8')).prospects.slice(0, 1000);
  } catch {
    prospects = [{ id: 'PROSP-0001', name: 'Despacho Contable MX', industry: 'contabilidad', city: 'CDMX' }];
  }
  
  const campaign = generateCampaign(campaignConfig, prospects, { channels });
  
  if (dryRun) {
    console.log('=== CAMPAIGN PREVIEW ===');
    console.log(`Product: ${campaign.config.productName}`);
    console.log(`Prospects: ${campaign.metrics.totalProspects}`);
    console.log(`Channels: ${channels.join(', ')}`);
    console.log(`\nPreview (first prospect):`);
    Object.entries(campaign.channels).forEach(([ch, data]) => {
      console.log(`\n--- ${ch} ---`);
      console.log(data.template.substring(0, 500));
    });
    console.log('\n✅ DRY RUN. No email sent.');
    return;
  }
  
  const outPath = resolve(outDir, `email-campaign-${campaign.id}.json`);
  writeFileSync(outPath, JSON.stringify(campaign, null, 2), 'utf8');
  console.log(`✅ Campaign generated: ${outPath}`);
  console.log(`   Prospects: ${campaign.metrics.totalProspects}`);
}

main();
