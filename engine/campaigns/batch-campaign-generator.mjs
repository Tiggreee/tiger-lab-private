#!/usr/bin/env node
/**
 * Batch Campaign Generator — engine/campaigns/batch-campaign-generator.mjs
 * Generates 25 unique campaign variants per product.
 * 5 headlines × 1 product = 5 variants. 5 networks per variant = 25 posts.
 * Runs in daily pipeline. Ensures fresh content for every production cycle.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const OUT_DIR = resolve('ops/traffic/outbox');
const CAMPAIGNS_DIR = resolve('ops/runtime/campaigns');

const HEADLINES = {
  'Docflow API': [
    'Cierra tu flujo documental en minutos, no en horas.',
    'Facturación y control en un solo tablero operativo.',
    'Tu operación crece mejor cuando el papeleo no estorba.',
    'CFDI 4.0 integrado desde el día uno, sin parches.',
    'Menos retrabajo. Más facturas correctas a la primera.',
    'Automatiza validación, timbrado y seguimiento en una sola API.',
    'Escala tu despacho sin escalar el caos administrativo.',
    'Convierte procesos manuales en flujos medibles y rápidos.',
    'Documentos listos para auditoría sin maratones de fin de mes.',
    'Estandariza tu operación documental con control real.'
  ],
  'Script Premium Kit': [
    '20+ scripts probados. 0 programación necesaria.',
    'Automatiza tu negocio sin escribir una línea de código.',
    'Scripts listos para usar. Resultados inmediatos.',
    '¿Sigues haciendo tareas repetitivas manualmente?',
    'El kit de automatización para PyMEs más completo.',
    'Instala, ejecuta, ahorra. Así de simple.',
    'Scripts mexicanos para empresas mexicanas.',
    'Automatización plug-and-play. Sin curva de aprendizaje.',
    'Delegale a los scripts. Tú enfócate en crecer.',
    'Resultados en minutos, no en meses.'
  ]
};

const BODY = {
  'Docflow API': 'Docflow API automatiza TODO tu flujo documental. Integración con CFDI 4.0 nativo. API-first. Conecta con lo que ya usas. Primer mes con precio de lanzamiento.',
  'Script Premium Kit': 'Automatiza contabilidad, facturación y administración en minutos. 20+ scripts probados. Sin programar. Sin dolores de cabeza. Actualizaciones incluidas.'
};

const CTA = {
  'Docflow API': 'Prueba 7 días gratis',
  'Script Premium Kit': 'Descarga el kit gratis'
};

const CHECKOUT = {
  'Docflow API': 'https://tiger-backend-production.up.railway.app/checkout?product=docflow-api',
  'Script Premium Kit': 'https://tiger-backend-production.up.railway.app/checkout?product=script-premium-kit'
};

const BRAND = {
  'Docflow API': {
    productName: 'Docflow API',
    problemDetail: 'procesos documentales lentos con integraciones fragiles',
    primaryOutcome: 'orquestar documentos y CFDI por API con trazabilidad',
    proofPoint: 'equipos con endpoints estables reducen errores de integracion y retrabajo',
    domainTerms: ['cfdi', 'api', 'documental', 'timbrado', 'facturacion']
  },
  'Script Premium Kit': {
    productName: 'Script Premium Kit',
    problemDetail: 'tareas administrativas repetitivas hechas a mano',
    primaryOutcome: 'automatizar contabilidad y administracion sin programar',
    proofPoint: '20+ scripts probados que ahorran horas de trabajo manual',
    domainTerms: ['scripts', 'contabilidad', 'automatizacion', 'pymes']
  }
};

const CHANNELS = ['linkedin', 'x', 'facebook', 'telegram', 'discord'];

function generateBatch(product, count = 25) {
  const headlines = HEADLINES[product] || HEADLINES['Docflow API'];
  const body = BODY[product] || '';
  const cta = CTA[product] || '';
  const url = CHECKOUT[product] || '';
  
  const packs = [];
  
  for (let i = 0; i < count; i++) {
    const headline = headlines[i % headlines.length];
    const variant = i + 1;
    
    const pack = {
      campaign: `${product.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-batch-${variant}`,
      generatedAt: new Date().toISOString(),
      product,
      variant,
      headline,
      brand: BRAND[product] || BRAND['Docflow API'],
      funnel: {
        trafficDestination: url,
        closeChannel: 'landing',
        closeDestination: url,
        closeLink: url
      },
      channels: {}
    };
    
    for (const ch of CHANNELS) {
      const limits = { linkedin: 3000, x: 280, facebook: 2000, telegram: 4096, discord: 2000 };
      const max = limits[ch] || 2000;
      
      let copy = `${product}: ${headline}\n\n${body}\n\n${cta}: ${url}`;
      
      // Channel-specific adaptation
      if (ch === 'x') copy = `${product}: ${headline}\n${body.substring(0, 100)}...\n${url}`;
      if (ch === 'linkedin') copy = `🔥 ${product} — ${headline}\n\n${body}\n\n💡 ${cta}\n👉 ${url}\n\n#Automatización #SaaS #PyMEs #TigerLab`;
      if (ch === 'facebook') copy = `🔥 ${product} — ${headline}\n\n${body}\n\n✅ ${cta}\n👉 ${url}`;
      if (ch === 'telegram') copy = `*${product}*\n\n${headline}\n\n${body}\n\n[${cta}](${url})`;
      if (ch === 'discord') copy = `**${product}**\n\n${headline}\n\n${body}\n\n${url}`;
      
      // Truncate to limit
      if (copy.length > max) copy = copy.substring(0, max - 3) + '...';
      
      pack.channels[ch] = { copyPaste: copy, chars: copy.length, limit: max };
    }
    
    packs.push(pack);
  }
  
  return packs;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(CAMPAIGNS_DIR, { recursive: true });
  
  const args = process.argv.slice(2);
  const count = parseInt(args.find(a => /^\d+$/.test(a)) || '25');
  
  console.log('=== BATCH CAMPAIGN GENERATOR ===\n');
  
  let totalPacks = 0;
  let totalPosts = 0;
  
  for (const product of Object.keys(HEADLINES)) {
    const packs = generateBatch(product, count);
    
    // Save as single batch file
    const batchFile = join(OUT_DIR, `batch-campaigns-${product.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`);
    writeFileSync(batchFile, JSON.stringify({
      generatedAt: new Date().toISOString(),
      product,
      totalPacks: packs.length,
      packs
    }, null, 2), 'utf8');
    
    // Also save individual packs for autopilot
    for (const pack of packs) {
      const packFile = join(OUT_DIR, `social-pack-${pack.campaign}.json`);
      writeFileSync(packFile, JSON.stringify(pack, null, 2), 'utf8');
    }
    
    const postsPerProduct = packs.length * CHANNELS.length;
    totalPacks += packs.length;
    totalPosts += postsPerProduct;
    
    console.log(`📦 ${product}: ${packs.length} packs × ${CHANNELS.length} channels = ${postsPerProduct} posts`);
  }
  
  console.log(`\n✅ TOTAL: ${totalPacks} packs × ${CHANNELS.length} channels = ${totalPosts} unique posts`);
  console.log(`📂 Saved to: ${OUT_DIR}/`);
  console.log(`\n🔄 Pipeline ready: ${totalPacks} fresh campaigns for next production cycle`);
}

main();
