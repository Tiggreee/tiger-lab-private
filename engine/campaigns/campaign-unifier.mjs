#!/usr/bin/env node
/**
 * Campaign Unifier — engine/campaigns/campaign-unifier.mjs
 * Same content across ALL networks. Carousel support.
 * One campaign = all networks. Sandbox→Release→Production sync.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = resolve('ops/runtime/unified-campaigns');
const CHANNELS = ['linkedin','x','facebook','telegram','discord','email'];

const CAROUSEL_SPECS = {
  linkedin: { maxSlides:10, format:'pdf/carousel', size:'1080x1080' },
  facebook: { maxSlides:5, format:'image/multi', size:'1200x630' },
  instagram: { maxSlides:10, format:'image/carousel', size:'1080x1080' }
};

function generateUnifiedCampaign(product, stage = 'sandbox') {
  const campaign = {
    id: `UC-${Date.now()}`,
    product,
    stage, // sandbox | release | production
    unified: true,
    createdAt: new Date().toISOString(),
    copy: {
      headline: '',
      body: '',
      cta: '',
      url: ''
    },
    channels: {},
    carousel: null
  };
  
  // UNIFIED copy — same across ALL channels
  const copy = {
    'Docflow API': {
      headline: 'Deja de perder 10h/semana en papeleo.',
      body: 'Docflow API automatiza tu flujo documental. CFDI 4.0 nativo. API-first. Integración en minutos.',
      cta: 'Prueba 7 días gratis',
      url: 'https://tigerlab.dev/docflow'
    },
    'Script Premium Kit': {
      headline: '20+ scripts probados. 0 programación.',
      body: 'Automatiza contabilidad, facturación y administración. Scripts listos en minutos, no meses.',
      cta: 'Descarga el kit gratis',
      url: 'https://tigerlab.dev/scriptkit'
    }
  };
  
  campaign.copy = copy[product] || copy['Docflow API'];
  
  // Same copy for ALL channels — unified
  const unifiedText = `${campaign.copy.headline}\n\n${campaign.copy.body}\n\n${campaign.copy.cta}: ${campaign.copy.url}`;
  
  for (const ch of CHANNELS) {
    campaign.channels[ch] = {
      copy: unifiedText,
      format: ch === 'email' ? 'html' : 'text',
      approved: false,
      published: false,
      publishedAt: null,
      confirmed: false
    };
  }
  
  // Carousel for supported channels
  campaign.carousel = {
    enabled: true,
    slides: [
      { number:1, title:campaign.copy.headline, type:'title' },
      { number:2, title:'El problema', content:'10h/semana perdidas en papeleo manual' },
      { number:3, title:'La solución', content:`${product} automatiza todo el flujo` },
      { number:4, title:'Resultados', content:'CFDI 4.0 nativo. API-first. Sin fricción.' },
      { number:5, title:campaign.copy.cta, content:campaign.copy.url, type:'cta' }
    ],
    channels: ['linkedin', 'facebook']
  };
  
  return campaign;
}

function main() {
  const args = process.argv.slice(2);
  const stage = args.includes('--stage') ? args[args.indexOf('--stage')+1] : 'sandbox';
  const product = args.includes('--product') ? args[args.indexOf('--product')+1] : 'Docflow API';
  
  mkdirSync(OUT, { recursive: true });
  
  console.log('=== CAMPAIGN UNIFIER ===\n');
  console.log(`Product: ${product}`);
  console.log(`Stage: ${stage}`);
  console.log(`Channels: ${CHANNELS.join(', ')}`);
  
  // Generate for all active products if --all
  if (args.includes('--all')) {
    const products = ['Docflow API', 'Script Premium Kit'];
    const stages = ['sandbox', 'release', 'production'];
    
    for (const prod of products) {
      for (const st of stages) {
        const campaign = generateUnifiedCampaign(prod, st);
        const dir = resolve(OUT, `${prod.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${st}`);
        mkdirSync(dir, { recursive: true });
        writeFileSync(resolve(dir, 'campaign.json'), JSON.stringify(campaign, null, 2), 'utf8');
        
        // Channel files
        for (const [ch, data] of Object.entries(campaign.channels)) {
          writeFileSync(resolve(dir, `${ch}.txt`), data.copy, 'utf8');
        }
        
        // Carousel
        writeFileSync(resolve(dir, 'carousel.json'), JSON.stringify(campaign.carousel, null, 2), 'utf8');
      }
    }
    
    console.log(`\n✅ Generated: 2 products × 3 stages = 6 unified campaigns`);
    console.log(`   Each: 6 channels + carousel`);
    console.log(`   Total: 36 channel files + 6 carousels`);
    
  } else {
    const campaign = generateUnifiedCampaign(product, stage);
    const dir = resolve(OUT, `${product.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${stage}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'campaign.json'), JSON.stringify(campaign, null, 2), 'utf8');
    
    for (const [ch, data] of Object.entries(campaign.channels)) {
      writeFileSync(resolve(dir, `${ch}.txt`), data.copy, 'utf8');
    }
    writeFileSync(resolve(dir, 'carousel.json'), JSON.stringify(campaign.carousel, null, 2), 'utf8');
    
    console.log(`\n✅ Generated: ${dir}`);
    console.log(`   ${Object.keys(campaign.channels).length} channels + carousel`);
  }
}

main();
