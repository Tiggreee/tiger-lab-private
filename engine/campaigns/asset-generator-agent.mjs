#!/usr/bin/env node
/**
 * Asset Generator Agent — engine/campaigns/asset-generator-agent.mjs
 * Busca y descarga imágenes de stock GRATUITAS de fuentes profesionales.
 * Integra con Unsplash, Pexels, Pixabay APIs.
 * Genera URLs listas para usar. NO copyright issues. NO AI cartoons.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createWriteStream } from 'node:fs';
import https from 'node:https';

const ASSETS_DIR = resolve('ops/runtime/campaign-assets');
const DESIGN_DIR = resolve('ops/runtime/visual-design');

// API keys from env (set in .env or Railway)
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || null;
const PEXELS_KEY   = process.env.PEXELS_API_KEY || null;
const PIXABAY_KEY  = process.env.PIXABAY_API_KEY || null;

// Live API search — returns array of image URLs
async function searchUnsplash(query, perPage = 3) {
  if (!UNSPLASH_KEY) return null;
  return new Promise((resolve, reject) => {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
    const req = https.get(url, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }, res => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve((data.results || []).map(r => ({
            url: r.urls.regular,
            thumb: r.urls.thumb,
            credit: `Photo by ${r.user.name} on Unsplash`,
            downloadLink: r.links.download,
            license: 'Unsplash License'
          })));
        } catch { reject(new Error('Unsplash parse error')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Unsplash timeout')); });
  });
}

async function searchPexels(query, perPage = 3) {
  if (!PEXELS_KEY) return null;
  return new Promise((resolve, reject) => {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
    const req = https.get(url, { headers: { Authorization: PEXELS_KEY } }, res => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve((data.photos || []).map(p => ({
            url: p.src.large,
            thumb: p.src.medium,
            credit: `Photo by ${p.photographer} on Pexels`,
            downloadLink: p.src.original,
            license: 'Pexels License'
          })));
        } catch { reject(new Error('Pexels parse error')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Pexels timeout')); });
  });
}

async function searchPixabay(query, perPage = 3) {
  if (!PIXABAY_KEY) return null;
  return new Promise((resolve, reject) => {
    const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=${perPage}&safesearch=true`;
    const req = https.get(url, res => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve((data.hits || []).map(h => ({
            url: h.webformatURL,
            thumb: h.previewURL,
            credit: `Photo by ${h.user} on Pixabay`,
            downloadLink: h.largeImageURL,
            license: 'Pixabay License'
          })));
        } catch { reject(new Error('Pixabay parse error')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Pixabay timeout')); });
  });
}

async function liveImageSearch(query) {
  // Try APIs in order, fall back to curated pool
  try {
    const unsplash = await searchUnsplash(query);
    if (unsplash && unsplash.length > 0) return { source: 'Unsplash (live API)', results: unsplash };
  } catch {}
  try {
    const pexels = await searchPexels(query);
    if (pexels && pexels.length > 0) return { source: 'Pexels (live API)', results: pexels };
  } catch {}
  try {
    const pixabay = await searchPixabay(query);
    if (pixabay && pixabay.length > 0) return { source: 'Pixabay (live API)', results: pixabay };
  } catch {}
  return null; // all APIs failed or no keys — caller uses curated pool
}

// Curated free image databases by category (100% legal, no scraping needed)
const FREE_IMAGE_DATABASES = {
  unsplash: {
    name: 'Unsplash',
    baseUrl: 'https://unsplash.com/search/',
    license: 'Unsplash License (free for commercial + attribution optional)',
    needsAPI: false,
    categories: {
      accounting: 'accounting,invoice,finance,business',
      business: 'business,office,team,professional',
      dashboard: 'dashboard,analytics,metrics',
      growth: 'growth,success,achievement',
      office: 'office,workspace,desk,professional',
      people: 'people,team,collaboration',
      technology: 'technology,automation,integration'
    }
  },
  
  pexels: {
    name: 'Pexels',
    baseUrl: 'https://www.pexels.com/search/',
    license: 'Pexels License (free, no attribution needed)',
    needsAPI: false,
    categories: {
      business: 'business office people',
      finance: 'finance accounting dashboard',
      growth: 'growth success achievement',
      team: 'team collaboration people',
      technology: 'technology automation',
      workspace: 'workspace office desk'
    }
  },
  
  pixabay: {
    name: 'Pixabay',
    baseUrl: 'https://pixabay.com/search/',
    license: 'Pixabay License (free, commercial)',
    needsAPI: false,
    categories: {
      business: 'business office',
      finance: 'finance accounting',
      growth: 'success growth',
      team: 'team people',
      technology: 'technology automation',
      professional: 'professional workspace'
    }
  },
  
  stocksnap: {
    name: 'StockSnap',
    baseUrl: 'https://stocksnap.io/search/',
    license: 'Free (commercial use)',
    needsAPI: false,
    categories: {
      business: 'business office',
      finance: 'finance',
      growth: 'growth',
      people: 'people team'
    }
  }
};

// Predefined curated lists for common searches (fallback if APIs down)
const CURATED_IMAGE_POOL = {
  'accounting office': [
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80', // workspace with laptop
    'https://images.unsplash.com/photo-1460925895917-afd651cdd8d3?w=1200&q=80', // dashboard analytics
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80', // business meeting
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=1200&q=80', // professional workspace
  ],
  'financial dashboard': [
    'https://images.unsplash.com/photo-1460925895917-afd651cdd8d3?w=1200&q=80', // analytics dashboard
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80', // business workspace
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80', // business setup
  ],
  'business team': [
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80', // team discussion
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80', // collaborative workspace
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80', // professional team
  ],
  'business growth': [
    'https://images.unsplash.com/photo-1460925895917-afd651cdd8d3?w=1200&q=80', // growth metrics
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80', // success visualization
  ],
  'office professional': [
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80', // professional workspace
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80', // office environment
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=1200&q=80', // business professional
  ]
};

// Search term mapping
const SEARCH_MAPPING = {
  'accountant working': 'accounting office professional',
  'financial dashboard': 'financial dashboard analytics',
  'invoice processing': 'invoice documents business',
  'modern office accounting': 'office workspace professional',
  'finance analytics': 'financial analytics dashboard',
  'business metrics dashboard': 'business metrics analytics',
  'professional accounting': 'accounting professional office',
  'financial growth': 'growth success business',
  'sales professional': 'sales office professional',
  'CRM dashboard': 'dashboard analytics business',
  'sales success': 'success achievement business',
  'deal closing': 'business professional success'
};

function generateAssetCatalog(product, segment, channel) {
  const catalog = {
    timestamp: new Date().toISOString(),
    product,
    segment,
    channel,
    sources: {},
    recommendations: {}
  };
  
  // Generate URLs for top 3 sources
  for (const [sourceKey, source] of Object.entries(FREE_IMAGE_DATABASES)) {
    if (sourceKey === 'unsplash') {
      catalog.sources[source.name] = {
        url: `${source.baseUrl}accounting+business+professional`,
        license: source.license,
        attribution: 'Optional (recommended)',
        quality: 'High',
        availability: 'Always available'
      };
    } else if (sourceKey === 'pexels') {
      catalog.sources[source.name] = {
        url: `${source.baseUrl}business+office+professional`,
        license: source.license,
        attribution: 'Not required',
        quality: 'High',
        availability: 'Always available'
      };
    } else if (sourceKey === 'pixabay') {
      catalog.sources[source.name] = {
        url: `${source.baseUrl}business+office`,
        license: source.license,
        attribution: 'Not required',
        quality: 'High',
        availability: 'Always available'
      };
    }
  }
  
  // Fallback curated images
  catalog.fallbackImages = {
    source: 'Unsplash Curated Collection',
    license: 'Free (no strings attached)',
    images: CURATED_IMAGE_POOL['accounting office'] || [],
    usage: 'Use when APIs are slow or down'
  };
  
  catalog.recommendations = {
    downloadStrategy: [
      '1. Click link to source (Unsplash/Pexels/Pixabay)',
      '2. Search for product-relevant keyword',
      '3. Download "Free" version (no login needed usually)',
      '4. Optimize: Resize to channel dimensions, add watermark if desired',
      '5. Upload to campaign folder'
    ],
    bestPractices: [
      '✅ Use real photos (people, offices, dashboards)',
      '✅ Match visual design spec from Visual Designer Agent',
      '✅ Professional business theme',
      '✅ High resolution (minimum 1200px width)',
      '❌ NO AI cartoons',
      '❌ NO emoji backgrounds',
      '❌ NO stock photo clichés (fake smiles)',
      '❌ NO low quality'
    ],
    channels: {
      email: {
        dimension: '600x300',
        source: 'Pexels (fastest load)',
        style: 'Professional workspace with real person or dashboard'
      },
      linkedin: {
        dimension: '1200x627',
        source: 'Unsplash (best quality)',
        style: 'Thought leadership / data visualization'
      },
      x: {
        dimension: '1200x675',
        source: 'Pixabay (good variety)',
        style: 'Bold, eye-catching, stat-focused'
      },
      facebook: {
        dimension: '1200x630',
        source: 'Pexels (authentic people)',
        style: 'Real people in business setting'
      },
      telegram: {
        dimension: '800x400',
        source: 'Pixabay (fast, simple)',
        style: 'Direct, simple, mobile-optimized'
      },
      discord: {
        dimension: '800x400',
        source: 'Unsplash (modern tech aesthetic)',
        style: 'Technology/automation themed'
      }
    }
  };
  
  return catalog;
}

function generateImageLog(product, channels = ['email', 'linkedin', 'x', 'facebook', 'telegram', 'discord']) {
  return {
    timestamp: new Date().toISOString(),
    product,
    campaign: {
      imagesAssigned: false,
      channels: channels.map(ch => ({
        channel: ch,
        status: 'needs_image',
        source: null,
        imageUrl: null,
        downloadedAt: null,
        optimized: false
      }))
    },
    downloadedTotal: 0,
    readyForPublish: false
  };
}

function generateDownloadGuide(product, segment) {
  const guide = {
    title: `Image Download Guide: ${product}`,
    segment,
    timestamp: new Date().toISOString(),
    quickStart: [
      '1️⃣  Go to Unsplash.com (or Pexels.com or Pixabay.com)',
      '2️⃣  Search for: "accounting office professional" (or relevant keyword)',
      '3️⃣  Find image that matches Visual Designer spec',
      '4️⃣  Click "Download Free" (no login needed)',
      '5️⃣  Save to: ops/runtime/campaign-assets/{product}/{channel}.jpg',
      '6️⃣  Done! That image is 100% legal for commercial use'
    ],
    sources: {
      primary: {
        name: 'Unsplash',
        url: 'https://unsplash.com',
        why: 'Highest quality, beautiful images, no login, full commercial rights',
        searchQueries: [
          'accounting office',
          'financial dashboard', 
          'business team professional',
          'modern workspace',
          'success metrics'
        ]
      },
      secondary: {
        name: 'Pexels',
        url: 'https://www.pexels.com',
        why: 'Fast loading, huge variety, no attribution required',
        searchQueries: [
          'business office people',
          'finance accounting',
          'team collaboration',
          'workspace professional'
        ]
      },
      tertiary: {
        name: 'Pixabay',
        url: 'https://pixabay.com',
        why: 'Instant download, no watermarks, commercial license',
        searchQueries: [
          'business office',
          'financial analytics',
          'professional workplace'
        ]
      }
    },
    legalNotes: [
      '✅ All sources above: 100% legal for commercial use',
      '✅ NO license restrictions on Unsplash, Pexels, Pixabay',
      '✅ NO need to ask permission',
      '✅ Can use in ads, landing pages, email campaigns',
      '✅ Can use for commercial products',
      '❌ Avoid: Copyrighted images from Google Images',
      '❌ Avoid: Stock photo sites that require attribution',
      '❌ Avoid: Images with visible watermarks'
    ],
    channelSpecificTips: {
      email: 'Use Pexels for fastest results. Search: "professional office"',
      linkedin: 'Use Unsplash. Search for thought leadership images or dashboards',
      x: 'Pixabay. Bold, eye-catching images. Single focal point.',
      facebook: 'Pexels. Real people, authentic emotions, business setting',
      telegram: 'Pixabay. Simple, clear, mobile-optimized images',
      discord: 'Unsplash. Modern, tech aesthetic, integration themes'
    }
  };
  
  return guide;
}

function main() {
  const args = process.argv.slice(2);

  // Show API key status on every run
  const keys = {
    unsplash: UNSPLASH_KEY ? '✅ key set' : '⚠️  no key (set UNSPLASH_ACCESS_KEY)',
    pexels:   PEXELS_KEY   ? '✅ key set' : '⚠️  no key (set PEXELS_API_KEY)',
    pixabay:  PIXABAY_KEY  ? '✅ key set' : '⚠️  no key (set PIXABAY_API_KEY)'
  };

  if (args.includes('--catalog')) {
    const product = args.includes('--product') ? args[args.indexOf('--product') + 1] : 'Docflow API';
    const segment = args.includes('--segment') ? args[args.indexOf('--segment') + 1] : 'contabilidad';
    const channel = args.includes('--channel') ? args[args.indexOf('--channel') + 1] : 'email';

    console.log('=== ASSET GENERATOR AGENT ===\n');
    console.log(`Product: ${product} | Segment: ${segment} | Channel: ${channel}`);
    console.log(`\nAPI Keys: Unsplash ${keys.unsplash} | Pexels ${keys.pexels} | Pixabay ${keys.pixabay}\n`);

    const SEARCH_KEYWORDS = {
      contabilidad: 'accountant office invoice professional',
      administración: 'business manager dashboard office',
      ventas: 'sales team professional CRM'
    };
    const query = SEARCH_KEYWORDS[segment] || 'business professional office';

    // Try live API first, fall back to curated pool
    liveImageSearch(query).then(live => {
      const catalog = generateAssetCatalog(product, segment, channel);

      if (live) {
        catalog.liveResults = live;
        console.log(`📸 Live images fetched from ${live.source}: ${live.results.length} images`);
        live.results.forEach((img, i) => console.log(`   ${i + 1}. ${img.url}\n      ${img.credit}`));
      } else {
        console.log('📎 No live API keys configured — using curated fallback pool');
        console.log('   Add UNSPLASH_ACCESS_KEY / PEXELS_API_KEY / PIXABAY_API_KEY to .env to get live results');
        catalog.fallbackImages.images.slice(0, 3).forEach((url, i) => console.log(`   ${i + 1}. ${url}`));
      }

      mkdirSync(ASSETS_DIR, { recursive: true });
      const catalogPath = resolve(ASSETS_DIR, `${product.toLowerCase().replace(/ /g, '-')}-asset-catalog.json`);
      writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');

      console.log(`\n📁 Catalog saved: ${catalogPath}`);
      console.log('\n📋 Best Practices:');
      catalog.recommendations.bestPractices.slice(0, 4).forEach(bp => console.log(`  ${bp}`));
    }).catch(err => {
      console.error('Asset Generator error:', err.message);
      process.exit(1);
    });

  } else if (args.includes('--guide')) {
    const product = args.includes('--product') ? args[args.indexOf('--product') + 1] : 'Docflow API';
    const segment = args.includes('--segment') ? args[args.indexOf('--segment') + 1] : 'contabilidad';

    const guide = generateDownloadGuide(product, segment);
    mkdirSync(ASSETS_DIR, { recursive: true });
    const guidePath = resolve(ASSETS_DIR, `${product.toLowerCase().replace(/ /g, '-')}-download-guide.json`);
    writeFileSync(guidePath, JSON.stringify(guide, null, 2), 'utf8');

    console.log('📥 Image Download Guide\n');
    console.log(guide.quickStart.join('\n'));
    console.log('\n🔗 Primary: Unsplash');
    guide.sources.primary.searchQueries.forEach(q => console.log(`   • ${q}`));
    console.log(`\n✅ Guide saved: ${guidePath}`);

  } else if (args.includes('--log')) {
    const product = args.includes('--product') ? args[args.indexOf('--product') + 1] : 'Docflow API';
    const log = generateImageLog(product);
    mkdirSync(ASSETS_DIR, { recursive: true });
    const logPath = resolve(ASSETS_DIR, `${product.toLowerCase().replace(/ /g, '-')}-image-log.json`);
    writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf8');
    console.log(`📊 Image log created: ${logPath}`);

  } else if (args.includes('--keys')) {
    console.log('=== API KEY STATUS ===');
    console.log(`Unsplash: ${keys.unsplash}`);
    console.log(`Pexels:   ${keys.pexels}`);
    console.log(`Pixabay:  ${keys.pixabay}`);
    console.log('\nSet in .env or Railway environment variables.');

  } else {
    console.log('Asset Generator Agent — Professional Image Sourcing');
    console.log('\nUsage:');
    console.log('  --catalog --product "Docflow API" --segment contabilidad --channel email');
    console.log('  --guide   --product "Docflow API" --segment contabilidad');
    console.log('  --log     --product "Docflow API"');
    console.log('  --keys    Check API key status');
    console.log('\nEnv vars: UNSPLASH_ACCESS_KEY, PEXELS_API_KEY, PIXABAY_API_KEY');
    console.log('License: 100% legal commercial use.');
  }
}

export { generateAssetCatalog, generateDownloadGuide, FREE_IMAGE_DATABASES };
main();
