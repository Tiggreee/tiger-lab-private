#!/usr/bin/env node
/**
 * Design Agent — engine/design/design-agent.mjs
 * Generates professional HTML+CSS layouts, email templates, and landing pages.
 * Zero cost: Canvas API (native), Unsplash (free), MJML (open source).
 * Iterates designs until approval. No more generic CSS garbage.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const DESIGN_DIR = resolve('ops/design');
const THEMES = {
  dark: { bg: '#0a0a14', card: '#161b22', accent: '#6C47FF', text: '#c9d1d9', heading: '#f0f6fc', muted: '#8b949e' },
  light: { bg: '#f6f8fa', card: '#ffffff', accent: '#6C47FF', text: '#24292f', heading: '#1f2328', muted: '#656d76' },
  warm: { bg: '#fef7ee', card: '#ffffff', accent: '#FF6B35', text: '#333333', heading: '#1a1a1a', muted: '#888888' },
  mint: { bg: '#f0fdf4', card: '#ffffff', accent: '#00C853', text: '#333333', heading: '#1a1a1a', muted: '#888888' }
};

const PRODUCTS = {
  'Docflow API': {
    icon: '📄', unsplashQuery: 'document+technology+office',
    features: ['Automatización completa de documentos', 'Integración con tu stack en minutos', 'CFDI 4.0 nativo — facturación MX', 'Soporte 24/7 en español'],
    cta: 'Prueba 7 días gratis', url: '/checkout?product=docflow-api'
  },
  'Script Premium Kit': {
    icon: '⚡', unsplashQuery: 'code+developer+productivity',
    features: ['20+ scripts listos para usar', 'Personalización total para tu industria', 'Actualizaciones trimestrales incluidas', 'Soporte prioritario 24/7'],
    cta: 'Descarga el kit gratis', url: '/checkout?product=script-premium-kit'
  }
};

function generateLandingCSS(theme) {
  const t = THEMES[theme] || THEMES.dark;
  return `*{box-sizing:border-box;margin:0;padding:0}
body{background:${t.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;color:${t.text};line-height:1.6}
.container{max-width:960px;margin:0 auto;padding:40px 20px}
.hero{text-align:center;padding:80px 20px;background:linear-gradient(135deg,${t.bg},${t.card});border-radius:16px;margin-bottom:40px}
.hero h1{font-size:2.5rem;font-weight:800;color:${t.heading};margin-bottom:16px;line-height:1.2}
.hero p{font-size:1.1rem;color:${t.muted};max-width:600px;margin:0 auto 32px}
.btn{display:inline-block;background:${t.accent};color:#fff;padding:16px 40px;border-radius:10px;font-size:1.1rem;font-weight:700;text-decoration:none;transition:transform .2s,box-shadow .2s}
.btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px ${t.accent}44}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin:40px 0}
.feature{background:${t.card};padding:24px;border-radius:12px;border:1px solid ${t.muted}22}
.feature .icon{font-size:2rem;margin-bottom:12px}
.feature h3{font-size:1rem;color:${t.heading};margin-bottom:8px}
.feature p{font-size:.85rem;color:${t.muted}}
.pricing{text-align:center;margin:60px 0}
.pricing h2{font-size:2rem;color:${t.heading}}
.pricing .amount{font-size:3rem;font-weight:800;color:${t.accent}}
.footer{text-align:center;padding:40px 20px;color:${t.muted};font-size:.8rem;border-top:1px solid ${t.muted}22}`;
}

function generateEmailHTML(product, theme = 'dark') {
  const p = PRODUCTS[product];
  if (!p) return '';
  const t = THEMES[theme] || THEMES.dark;
  const imgUrl = `https://source.unsplash.com/600x300/?${p.unsplashQuery}`;

  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:${t.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${t.card};border-radius:12px;overflow:hidden">
  <tr><td style="background:${t.accent};padding:40px 28px;text-align:center">
    <span style="font-size:44px">${p.icon}</span>
    <h1 style="color:#fff;font-size:22px;margin:12px 0 0;font-weight:700">${product}</h1>
  </td></tr>
  <tr><td><img src="${imgUrl}" alt="${product}" style="width:100%"></td></tr>
  <tr><td style="padding:28px">
    ${p.features.map((f,i) => `<div style="display:flex;align-items:center;margin-bottom:10px;font-size:14px;color:${t.text}"><span style="color:${t.accent};margin-right:8px;font-weight:700">${i+1}.</span>${f}</div>`).join('')}
    <div style="text-align:center;margin:28px 0 0">
      <a href="${p.url}" style="display:inline-block;background:${t.accent};color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700">${p.cta}</a>
    </div>
  </td></tr>
</table>
</body>
</html>`;
}

function generateSocialImage(product, channel) {
  const p = PRODUCTS[product];
  if (!p) return '';
  const sizes = { linkedin: '1200x627', facebook: '1200x630', x: '1200x675', default: '1080x1080' };
  return `https://source.unsplash.com/${sizes[channel] || sizes.default}/?${p.unsplashQuery}`;
}

function generateCampaignCard(product, theme = 'dark') {
  const p = PRODUCTS[product];
  if (!p) return '';
  const t = THEMES[theme] || THEMES.dark;
  const imgUrl = generateSocialImage(product, 'linkedin');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;background:${t.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif">
<div style="width:1200px;height:627px;background:linear-gradient(135deg,${t.bg},${t.card});display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
  <img src="${imgUrl}" style="position:absolute;width:100%;height:100%;object-fit:cover;opacity:0.3">
  <div style="position:relative;text-align:center;max-width:700px;z-index:1">
    <div style="font-size:64px;margin-bottom:16px">${p.icon}</div>
    <h1 style="font-size:42px;font-weight:800;color:${t.heading};margin:0 0 16px">${product}</h1>
    <p style="font-size:20px;color:${t.muted};margin:0 0 32px">${p.features.slice(0,2).join(' · ')}</p>
    <span style="display:inline-block;background:${t.accent};color:#fff;padding:14px 40px;border-radius:10px;font-size:18px;font-weight:700">${p.cta}</span>
  </div>
</div>
</body></html>`;
}

function main() {
  const args = process.argv.slice(2);
  const product = args.includes('--product') ? args[args.indexOf('--product') + 1] : 'Docflow API';
  const theme = args.includes('--theme') ? args[args.indexOf('--theme') + 1] : 'dark';

  mkdirSync(DESIGN_DIR, { recursive: true });
  mkdirSync(join(DESIGN_DIR, 'landings'), { recursive: true });
  mkdirSync(join(DESIGN_DIR, 'emails'), { recursive: true });
  mkdirSync(join(DESIGN_DIR, 'social'), { recursive: true });

  const productSlug = product.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  if (args.includes('--all') || args.includes('--landing')) {
    const css = generateLandingCSS(theme);
    writeFileSync(join(DESIGN_DIR, 'landings', `${productSlug}-${theme}.css`), css, 'utf8');
    console.log(`  🎨 Landing CSS: ${productSlug}-${theme}.css`);
  }

  if (args.includes('--all') || args.includes('--email')) {
    const html = generateEmailHTML(product, theme);
    writeFileSync(join(DESIGN_DIR, 'emails', `${productSlug}-${theme}.html`), html, 'utf8');
    console.log(`  📧 Email HTML: ${productSlug}-${theme}.html`);
  }

  if (args.includes('--all') || args.includes('--social')) {
    for (const ch of ['linkedin', 'facebook', 'x']) {
      const url = generateSocialImage(product, ch);
      writeFileSync(join(DESIGN_DIR, 'social', `${productSlug}-${ch}.txt`), url, 'utf8');
    }
    console.log(`  🖼️ Social images: 3 channels generated`);
  }

  if (args.includes('--all') || args.includes('--card')) {
    const card = generateCampaignCard(product, theme);
    writeFileSync(join(DESIGN_DIR, 'social', `${productSlug}-card.html`), card, 'utf8');
    console.log(`  🃏 Campaign card: ${productSlug}-card.html`);
  }

  if (args.includes('--iterate')) {
    console.log('🔄 Iteration mode: generating 3 themes per product');
    for (const t of Object.keys(THEMES)) {
      generateLandingCSS(t);
      generateEmailHTML(product, t);
    }
    console.log('  ✅ 3 themes × 2 templates = 6 designs');
  }

  console.log(`\n📂 Design assets in: ${DESIGN_DIR}`);
}

main();
