#!/usr/bin/env node
/**
 * Image Generation Agent — engine/design/image-generator.mjs
 * Generates professional social media images using Sharp + Unsplash.
 * Overlays campaign text onto stock photos. Per-channel sizing.
 * Zero cost. No AI API needed. Pure Node.js image processing.
 */

import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

const OUT_DIR = resolve('ops/design/generated');
const CACHE_DIR = resolve('ops/design/cache');

const CHANNEL_SPECS = {
  linkedin: { width: 1200, height: 627, label: 'LinkedIn' },
  facebook: { width: 1200, height: 630, label: 'Facebook' },
  x:        { width: 1200, height: 675, label: 'X/Twitter' },
  instagram:{ width: 1080, height: 1080, label: 'Instagram' },
  email:    { width: 600,  height: 300, label: 'Email' },
  default:  { width: 1200, height: 628, label: 'Default' }
};

const COLORS = {
  'Docflow API': { gradient: ['#6C47FFcc', '#3A1F88cc'], accent: '#FF6B35', text: '#ffffff' },
  'Script Premium Kit': { gradient: ['#00C853cc', '#006622cc'], accent: '#FF6D00', text: '#ffffff' }
};

async function fetchBaseImage(query) {
  const cacheFile = join(CACHE_DIR, `${query.replace(/[^a-z0-9]+/g, '-')}.jpg`);
  if (existsSync(cacheFile)) return cacheFile;
  
  const url = `https://source.unsplash.com/1200x628/?${query}`;
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    execSync(`curl -sL "${url}" -o "${cacheFile}"`, { stdio: 'pipe', timeout: 10000 });
    if (existsSync(cacheFile)) return cacheFile;
  } catch {}
  return null;
}

async function generateImage(product, headline, channel, outputName) {
  const spec = CHANNEL_SPECS[channel] || CHANNEL_SPECS.default;
  const colors = COLORS[product] || COLORS['Docflow API'];
  const outPath = join(OUT_DIR, `${outputName}.png`);
  
  mkdirSync(OUT_DIR, { recursive: true });
  
  // Try fetching base image
  const queries = { 'Docflow API': 'technology+office+document', 'Script Premium Kit': 'code+developer+productivity' };
  let baseImg = await fetchBaseImage(queries[product] || 'technology+automation');
  
  let finalImage;
  const gradientSvg = Buffer.from(`<svg width="${spec.width}" height="${spec.height}">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${colors.gradient[0]}"/>
        <stop offset="100%" style="stop-color:${colors.gradient[1]}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="60" y="${spec.height * 0.55}" font-size="${Math.floor(spec.width * 0.04)}" font-weight="bold" fill="${colors.text}" font-family="Arial, sans-serif">${headline}</text>
    <text x="60" y="${spec.height * 0.75}" font-size="${Math.floor(spec.width * 0.025)}" fill="${colors.text}cc" font-family="Arial, sans-serif">${product}</text>
    <rect x="60" y="${spec.height * 0.83}" width="${Math.floor(spec.width * 0.25)}" height="4" fill="${colors.accent}" rx="2"/>
  </svg>`);
  
  const gradientLayer = await sharp(gradientSvg).resize(spec.width, spec.height).png().toBuffer();
  
  // Base image optional — fall through to gradient-only if unavailable
  if (baseImg) {
    try {
      finalImage = await sharp(baseImg)
        .resize(spec.width, spec.height, { fit: 'cover', position: 'center' })
        .composite([{ input: gradientLayer, blend: 'over' }])
        .png()
        .toFile(outPath);
    } catch { baseImg = null; }
  }
  
  if (!baseImg) {
    // Gradient-only fallback — always works
    finalImage = await sharp(gradientLayer).png().toFile(outPath);
  }
  
  return { path: outPath, size: `${spec.width}x${spec.height}`, channel };
}

async function generateBatch(product, headlines, channels = ['linkedin', 'facebook', 'x']) {
  console.log(`=== IMAGE GENERATOR — ${product} ===\n`);
  const results = [];
  let count = 0;
  
  for (let i = 0; i < Math.min(headlines.length, 10); i++) {
    for (const ch of channels) {
      const outputName = `${product.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${ch}-v${i + 1}`;
      const result = await generateImage(product, headlines[i % headlines.length], ch, outputName);
      results.push(result);
      count++;
      process.stdout.write(`  ✅ ${outputName}.png (${result.size})\n`);
    }
  }
  
  console.log(`\n📊 Total: ${count} images generated`);
  console.log(`📂 Output: ${OUT_DIR}/`);
  return results;
}

function main() {
  const args = process.argv.slice(2);
  const product = args.includes('--product') ? args[args.indexOf('--product') + 1] : 'Docflow API';
  
  const headlines = {
    'Docflow API': ['Automatiza tus documentos hoy', 'CFDI 4.0 sin estres', 'Tu tiempo vale mas', 'Facturacion electronica MX', 'Adios al papeleo', 'Workflows inteligentes', 'API-first documental', 'Integracion en minutos', 'Soporte 24/7 en espanol', 'Prueba 7 dias gratis'],
    'Script Premium Kit': ['20+ scripts probados', 'Sin programar', 'Resultados inmediatos', 'Kit de automatizacion', 'PyMEs mas productivas', 'Automatiza tu negocio', 'Scripts listos hoy', 'Plug and play', 'Sin dolores de cabeza', 'Descarga gratis']
  };
  
  const h = headlines[product] || headlines['Docflow API'];
  return generateBatch(product, h);
}

main().catch(e => console.error('Image generation failed:', e.message));
