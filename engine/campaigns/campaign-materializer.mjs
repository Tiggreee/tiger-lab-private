#!/usr/bin/env node
/**
 * Campaign Materializer — engine/campaigns/campaign-materializer.mjs
 * Generates REAL marketing assets: HTML emails, social posts, image prompts.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Optional MJML support for professional email templates
let mjml2html = null;
try { mjml2html = (await import('mjml')).default; } catch {}

const CAMPAIGNS_DIR = resolve('ops/runtime/campaigns');

const PRODUCTS = {
  'Docflow API': {
    color: '#6C47FF',
    logo: '📄',
    unsplash: 'document+automation+technology',
    headline: 'Deja de perder 10 horas por semana en papeleo.',
    subhead: 'Docflow API automatiza todo tu flujo documental.',
    bullets: ['Automatización completa de documentos y flujos', 'Integración con tu stack en minutos, no meses', 'CFDI 4.0 nativo — facturación electrónica MX', 'API-first. Conecta con lo que ya usas.'],
    cta: 'Prueba 7 días gratis',
    url: 'https://tigerlab.dev/docflow',
    pricing: 'Desde $69/mes',
    testimonial: '"Ahorramos 15h/semana en facturación. El ROI fue inmediato." — Despacho Contable MX'
  },
  'Script Premium Kit': {
    color: '#00C853',
    logo: '⚡',
    unsplash: 'code+automation+productivity',
    headline: '20+ scripts probados. 0 programación. Resultados hoy.',
    subhead: 'Automatiza contabilidad, facturación y administración en minutos.',
    bullets: ['20+ scripts listos para usar, probados en producción', 'Personalización total para tu industria', 'Actualizaciones trimestrales incluidas', 'Soporte prioritario en español 24/7'],
    cta: 'Descarga el kit gratis',
    url: 'https://tigerlab.dev/scriptkit',
    pricing: 'Desde $89/mes',
    testimonial: '"Instalamos 5 scripts en una tarde. Mi contador ya no trabaja fines de semana." — PyME Monterrey'
  }
};

function emailHTML(product) {
  const p = PRODUCTS[product];
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F3FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(108,71,255,0.12);">
  <tr><td style="background:${p.color};padding:48px 32px;text-align:center;">
    <div style="font-size:48px;margin-bottom:12px;">${p.logo}</div>
    <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;line-height:1.3;">${p.headline}</h1>
    <p style="color:rgba(255,255,255,0.9);margin:12px 0 0;font-size:16px;">${p.subhead}</p>
  </td></tr>
  <tr><td style="padding:32px;">
    <div style="background:#F8F6FF;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:#333;font-size:15px;margin:0 0 16px;font-weight:600;">${product} te ofrece:</p>
      ${p.bullets.map((b,i) => `<div style="display:flex;align-items:flex-start;margin-bottom:12px;font-size:14px;color:#444;">
        <span style="color:${p.color};font-weight:700;margin-right:10px;flex-shrink:0;">${i+1}.</span>
        <span>${b}</span>
      </div>`).join('')}
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="${p.url}" style="display:inline-block;background:${p.color};color:#fff;text-decoration:none;padding:16px 48px;border-radius:10px;font-size:16px;font-weight:700;box-shadow:0 4px 16px ${p.color}44;">${p.cta}</a>
      <p style="color:#888;font-size:13px;margin-top:8px;">${p.pricing} · Sin compromiso · Cancela cuando quieras</p>
    </div>
    <div style="border-left:3px solid ${p.color};padding-left:16px;margin:24px 0;">
      <p style="color:#666;font-size:14px;font-style:italic;">${p.testimonial}</p>
    </div>
  </td></tr>
  <tr><td style="background:#F8F6FF;padding:20px 32px;text-align:center;">
    <p style="color:#999;font-size:12px;margin:0;">© 2026 Tiger Lab. Todos los derechos reservados.<br>Este email fue enviado porque tu empresa está en nuestro pipeline de leads calificados.</p>
  </td></tr>
</table>
</body>
</html>`;
}

function linkedinPost(product) {
  const p = PRODUCTS[product];
  return `🔥 ${p.headline}

${p.subhead}

${p.bullets.map(b => `✅ ${b}`).join('\n')}

💡 ${p.cta}: ${p.url}

${p.testimonial}

#Automatización #SaaS #PyMEs #Productividad #TigerLab`;
}

function xPost(product) {
  const p = PRODUCTS[product];
  return `🔥 ${p.headline}\n\n${p.subhead}\n\n${p.cta}: ${p.url}\n\n#Automatización #SaaS #PyMEs`;
}

function facebookPost(product) {
  const p = PRODUCTS[product];
  return `🔥 ${p.headline}

${p.subhead}

${p.bullets.map(b => `✅ ${b}`).join('\n')}

💡 ${p.cta}
👉 ${p.url}

${p.testimonial}`;
}

function telegramPost(product) {
  const p = PRODUCTS[product];
  return `*${product}* 🔥\n\n${p.headline}\n\n${p.subhead}\n\n${p.bullets.map(b => `✅ ${b}`).join('\n')}\n\n[${p.cta}](${p.url})\n\n_${p.testimonial}_`;
}

function discordPost(product) {
  const p = PRODUCTS[product];
  return `**${product}** 🔥\n\n${p.headline}\n\n${p.subhead}\n\n${p.bullets.map(b => `✅ ${b}`).join('\n')}\n\n👉 ${p.url}`;
}

function imagePrompt(product, channel) {
  const p = PRODUCTS[product];
  const sizes = { email:'600x300', linkedin:'1200x627', x:'1200x675', facebook:'1200x630' };
  const size = sizes[channel] || '800x400';
  const query = encodeURIComponent(p.unsplash || 'technology+automation');
  return `https://source.unsplash.com/${size}/?${query}`;
}

function main() {
  const args = process.argv.slice(2);
  const product = args.includes('--product') ? args[args.indexOf('--product')+1] : 'Docflow API';
  
  if (!PRODUCTS[product]) { console.error('Unknown product:', product); process.exit(1); }
  
  const id = `CAMP-MAT-${Date.now()}`;
  const dir = resolve(CAMPAIGNS_DIR, id);
  mkdirSync(dir, { recursive: true });
  mkdirSync(resolve(dir, 'images'), { recursive: true });
  
  const generators = { email:emailHTML, linkedin:linkedinPost, x:xPost, facebook:facebookPost, telegram:telegramPost, discord:discordPost };
  
  for (const [ch, gen] of Object.entries(generators)) {
    const content = gen(product);
    const ext = ch === 'email' ? 'html' : ch === 'telegram' || ch === 'discord' ? 'md' : 'txt';
    writeFileSync(resolve(dir, `${ch}.${ext}`), content, 'utf8');
    writeFileSync(resolve(dir, 'images', `${ch}-prompt.txt`), imagePrompt(product, ch), 'utf8');
  }
  
  const campaign = { id, product, target: 'general', score: 90, status: 'draft', channels: Object.keys(generators), createdAt: new Date().toISOString(), copies: Object.fromEntries(Object.entries(generators).map(([ch,gen]) => [ch, gen(product).substring(0,120)])) };
  writeFileSync(resolve(dir, 'campaign.json'), JSON.stringify(campaign, null, 2), 'utf8');
  
  console.log(`✅ Campaign materialized: ${id}`);
  console.log(`   Product: ${product}`);
  console.log(`   Files: ${Object.keys(generators).length} channels + image prompts`);
  console.log(`   Dir: ${dir}`);
}

main();
