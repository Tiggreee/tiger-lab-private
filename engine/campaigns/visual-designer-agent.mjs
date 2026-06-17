#!/usr/bin/env node
/**
 * Visual Designer Agent — engine/campaigns/visual-designer-agent.mjs
 * Genera prompts profesionales para imágenes.
 * Integra con Asset Generator para obtener imágenes reales de stock.
 * NO emojis, NO fondos simples. Imágenes PROFESIONALES.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const DESIGN_DIR = resolve('ops/runtime/visual-design');

// Professional image prompt templates by industry + channel
const VISUAL_FRAMEWORKS = {
  contabilidad: {
    email: {
      style: 'Modern minimalist business professional',
      elements: ['Real workspace with invoice/document on screen', 'Charts/metrics', 'Professional person working'],
      mood: 'Trustworthy, efficient, modern',
      colors: ['Deep blue #003366', 'Accent green #00AA44', 'Clean white'],
      avoid: ['Cartoons', 'Emojis', 'Stock photo clichés', 'Overly bright colors'],
      prompt: 'Professional workspace photo: accountant working at modern desk with multiple monitors displaying financial dashboards, real invoices and CFDI documents. Color-graded with deep blues and professional greens. Shot from above, natural lighting, modern office. 3840x2160. Stock photography style. No people faces visible.'
    },
    linkedin: {
      style: 'Thought leadership / Data visualization',
      elements: ['Data visualization/charts', 'Business metrics', 'Real office environment'],
      mood: 'Expert, data-driven, trustworthy',
      colors: ['Corporate blues', 'Professional accent colors'],
      avoid: ['Low quality', 'Cheesy', 'Outdated'],
      prompt: 'Modern financial dashboard visualization: colorful but professional charts, graphs, and metrics on dark background. Real data analytics interface aesthetic. Financial technology theme. No people. 1200x627. Professional. High quality.'
    },
    facebook: {
      style: 'Relatable / Community focused',
      elements: ['Real people working', 'Success/relief expression', 'Business result visualization'],
      mood: 'Approachable, helpful, solution-oriented',
      colors: ['Warm but professional', 'High contrast'],
      avoid: ['Stock photo desperation looks'],
      prompt: 'Real photograph: small business owner or accountant looking satisfied at their desk with computer showing financial results. Natural lighting, authentic expression. Real office environment. 1200x630. Stock photo quality.'
    },
    x: {
      style: 'Bold / Eye-catching / Data-focused',
      elements: ['Strong visual impact', 'Clear data point', 'Minimal text overlay'],
      mood: 'Punchy, interesting, shareable',
      colors: ['High contrast', 'Bold choices'],
      avoid: ['Too busy', 'Unclear message'],
      prompt: 'Bold data visualization: single powerful metric or chart against contrasting background. Financial success visualization. 1200x675. High contrast. Minimalist design. Stock photography.'
    },
    telegram: {
      style: 'Direct / Community',
      elements: ['Real scenario', 'Authentic', 'Problem/solution focused'],
      mood: 'Helpful, direct, real',
      colors: ['Natural', 'High contrast for mobile'],
      avoid: ['Complicated imagery'],
      prompt: 'Simple professional image: accountant or business person with document, calculator, computer. Real scenario, authentic. Mobile optimized. 800x400. Clear and direct.'
    },
    discord: {
      style: 'Community / Technical',
      elements: ['Tech-forward', 'Community vibe', 'Integration/automation theme'],
      mood: 'Modern, technical, friendly',
      colors: ['Tech colors', 'Discord-friendly palette'],
      avoid: ['Corporate only'],
      prompt: 'Modern technology illustration or photo: APIs, integrations, automation theme. Business automation aesthetic. Tech-forward. 800x400. Clean design.'
    }
  },
  
  administración: {
    email: {
      style: 'Executive / Strategic',
      elements: ['Dashboard', 'Executive at desk', 'Strategic planning visuals'],
      mood: 'Professional, strategic, results-driven',
      colors: ['Executive blues and grays', 'Accent colors'],
      avoid: ['Casual', 'Cartoonish'],
      prompt: 'Executive workspace: manager at desk with large monitor displaying business dashboard and KPIs. Professional environment. Modern office. Color-graded with professional tones. 3840x2160. High quality.'
    },
    linkedin: {
      style: 'Leadership / Growth',
      elements: ['Growth visualization', 'Team collaboration', 'Strategic thinking'],
      mood: 'Visionary, growth-oriented, collaborative',
      colors: ['Aspirational colors', 'Professional'],
      avoid: ['Tired clichés'],
      prompt: 'Business growth visualization: upward trending charts, team collaboration, modern workspace. Dynamic but professional. 1200x627. Stock photography quality.'
    },
    facebook: {
      style: 'Team / Success',
      elements: ['Real team members', 'Celebration/success', 'Business achievement'],
      mood: 'Proud, successful, team-focused',
      colors: ['Warm, inviting'],
      avoid: ['Fake smiles'],
      prompt: 'Real photograph: business team celebrating success, reviewing results together. Authentic happy expressions. Modern office. 1200x630. Real people, real emotions.'
    },
    x: {
      style: 'Fast insight / Stat-driven',
      elements: ['Single key metric', 'Impact visualization'],
      mood: 'Impactful, shareable',
      colors: ['Bold', 'Clear'],
      avoid: ['Cluttered'],
      prompt: 'Bold metric visualization: important business statistic with strong visual impact. 1200x675. High contrast. Minimalist.'
    },
    telegram: {
      style: 'Direct / Actionable',
      elements: ['Clear action', 'Result visualization'],
      mood: 'Direct, helpful',
      colors: ['Mobile-optimized', 'Clear'],
      avoid: ['Complex'],
      prompt: 'Simple business image: productivity, efficiency, or results visualization. Mobile optimized. 800x400. Clear and direct.'
    },
    discord: {
      style: 'Community / Operational',
      elements: ['Operations visualization', 'Team tools', 'Workflow'],
      mood: 'Technical, collaborative, modern',
      colors: ['Modern tech palette'],
      avoid: ['Corporate only'],
      prompt: 'Modern workflow visualization: business operations, tools, team collaboration. Tech-forward aesthetic. 800x400.'
    }
  },
  
  ventas: {
    email: {
      style: 'Success / Conversion',
      elements: ['Sales dashboard', 'Success metrics', 'Professional salesperson'],
      mood: 'Motivational, successful, results-driven',
      colors: ['Success colors (greens)', 'Professional'],
      avoid: ['Cheesy motivational'],
      prompt: 'Professional salesperson at desk with CRM dashboard on screen, showing successful deal closed. Real environment. Professional. Color-graded. 3840x2160.'
    },
    linkedin: {
      style: 'Sales excellence / Pipeline',
      elements: ['Pipeline visualization', 'Sales metrics', 'Deal progression'],
      mood: 'Professional, data-driven, successful',
      colors: ['Sales-optimized colors'],
      avoid: ['Outdated sales imagery'],
      prompt: 'Sales pipeline or CRM dashboard visualization: deals, stages, metrics. Professional. Modern. 1200x627. Stock quality.'
    },
    facebook: {
      style: 'Success stories / Relatability',
      elements: ['Real salesperson', 'Happy customer interaction', 'Sales success'],
      mood: 'Friendly, successful, relatable',
      colors: ['Warm and professional'],
      avoid: ['Too salesy'],
      prompt: 'Real photograph: sales professional celebrating successful deal or positive customer interaction. Authentic happiness. Modern office. 1200x630.'
    },
    x: {
      style: 'Deal / Growth stat',
      elements: ['Single powerful metric', 'Revenue/growth number'],
      mood: 'Impactful, viral-worthy',
      colors: ['Bold, attention-getting'],
      avoid: ['Boring stats'],
      prompt: 'Bold sales metric visualization: impressive revenue, deal, or growth number. 1200x675. High contrast. Impactful.'
    },
    telegram: {
      style: 'Quick wins / Social proof',
      elements: ['Success metric', 'Real testimonial scenario'],
      mood: 'Motivational, proven',
      colors: ['Clear, positive'],
      avoid: ['Cluttered'],
      prompt: 'Simple success visualization: sales result or happy customer. Mobile optimized. 800x400. Clear.'
    },
    discord: {
      style: 'Community / Tools',
      elements: ['Sales tools', 'Integration', 'Automation'],
      mood: 'Technical, community, collaborative',
      colors: ['Modern palette'],
      avoid: ['Corporate jargon visual'],
      prompt: 'Sales tools or integration visualization: CRM, automation, pipeline tools. Tech aesthetic. 800x400.'
    }
  }
};

// Premium stock image APIs (free tier available)
const STOCK_APIS = {
  unsplash: {
    name: 'Unsplash',
    baseUrl: 'https://api.unsplash.com/search/photos',
    license: 'Free for commercial use',
    requiresKey: true,
    categories: ['accounting', 'business', 'dashboard', 'finance', 'office', 'team', 'growth', 'sales']
  },
  pexels: {
    name: 'Pexels',
    baseUrl: 'https://api.pexels.com/v1/search',
    license: 'Free for commercial use',
    requiresKey: true,
    categories: ['business', 'office', 'people', 'finance', 'technology', 'dashboard']
  },
  pixabay: {
    name: 'Pixabay',
    baseUrl: 'https://pixabay.com/api/',
    license: 'Free for commercial use',
    requiresKey: true,
    categories: ['business', 'finance', 'office', 'growth', 'success', 'team']
  },
  free_fallback: {
    name: 'Free resource database',
    description: 'Curated list of free professional images by category',
    license: 'Verified free for commercial use'
  }
};

function generateVisualBriefing(product, segment, channel) {
  const framework = VISUAL_FRAMEWORKS[segment] || VISUAL_FRAMEWORKS.contabilidad;
  const channelBrief = framework[channel] || framework.email;
  
  return {
    timestamp: new Date().toISOString(),
    product,
    segment,
    channel,
    visual: {
      style: channelBrief.style,
      elements: channelBrief.elements,
      mood: channelBrief.mood,
      colors: channelBrief.colors,
      dimensions: {
        email: '600x300',
        linkedin: '1200x627',
        x: '1200x675',
        facebook: '1200x630',
        telegram: '800x400',
        discord: '800x400'
      }[channel],
      avoid: channelBrief.avoid
    },
    prompts: {
      professional: channelBrief.prompt,
      keywords: generateSearchKeywords(product, segment, channel),
      quality: 'Stock photography / Professional / Real photos (NO emojis, NO AI cartoon)'
    },
    assetSources: Object.entries(STOCK_APIS)
      .filter(([k, v]) => k !== 'free_fallback')
      .map(([k, v]) => ({
        source: v.name,
        searchTerm: generateSearchKeywords(product, segment, channel)[0],
        license: v.license,
        priority: v.requiresKey ? 'high' : 'medium'
      }))
  };
}

function generateSearchKeywords(product, segment, channel) {
  const keywords = {
    contabilidad: {
      email: ['accountant working', 'financial dashboard', 'invoice processing', 'modern office accounting'],
      linkedin: ['finance analytics', 'business metrics dashboard', 'professional accounting', 'financial growth'],
      x: ['accounting efficiency', 'finance technology', 'business automation', 'SAT compliance'],
      facebook: ['small business accountant', 'financial success', 'business solutions', 'accounting help'],
      telegram: ['invoice management', 'business documents', 'accounting tools', 'financial organization'],
      discord: ['automation integration', 'API workflow', 'business automation', 'tech integration']
    },
    administración: {
      email: ['business manager', 'dashboard metrics', 'executive workspace', 'business analytics'],
      linkedin: ['business growth', 'leadership strategy', 'team collaboration', 'business metrics'],
      x: ['business efficiency', 'team productivity', 'management tools', 'operational excellence'],
      facebook: ['business team', 'company success', 'team collaboration', 'business achievement'],
      telegram: ['productivity tools', 'business operations', 'workflow management', 'team coordination'],
      discord: ['business integration', 'team tools', 'workflow automation', 'operational tools']
    },
    ventas: {
      email: ['sales professional', 'CRM dashboard', 'sales success', 'deal closing'],
      linkedin: ['sales pipeline', 'revenue growth', 'sales team', 'deal closure'],
      x: ['sales success', 'revenue achievement', 'deal closed', 'sales growth'],
      facebook: ['sales team', 'customer success', 'happy client', 'business growth'],
      telegram: ['sales tools', 'customer success', 'winning deal', 'sales achievement'],
      discord: ['sales automation', 'CRM integration', 'sales tools', 'pipeline management']
    }
  };
  
  const categoryKeywords = keywords[segment]?.[channel] || keywords.contabilidad.email;
  return categoryKeywords;
}

function generateDesignSpec(product, segment) {
  const spec = {
    generatedAt: new Date().toISOString(),
    product,
    segment,
    guidelines: {
      style: 'Professional stock photography. Real images. Modern business aesthetic.',
      technology: 'NO AI-generated cartoons. NO emoji backgrounds. NO simple color backgrounds.',
      quality: 'High resolution. Professional. Commercial-grade.',
      sourcing: [
        '✅ Unsplash API (free, commercial use)',
        '✅ Pexels API (free, commercial use)',
        '✅ Pixabay API (free, commercial use)',
        '❌ AI-generated images for now (quality issues)',
        '❌ Emoji + text only (not professional)',
        '❌ Copyright-restricted sources'
      ]
    },
    channels: {}
  };
  
  for (const channel of ['email', 'linkedin', 'x', 'facebook', 'telegram', 'discord']) {
    spec.channels[channel] = generateVisualBriefing(product, segment, channel);
  }
  
  return spec;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--design')) {
    const product = args.includes('--product') ? args[args.indexOf('--product') + 1] : 'Docflow API';
    const segment = args.includes('--segment') ? args[args.indexOf('--segment') + 1] : 'contabilidad';
    
    console.log('=== VISUAL DESIGNER AGENT ===\n');
    console.log(`Product: ${product}`);
    console.log(`Segment: ${segment}\n`);
    
    const spec = generateDesignSpec(product, segment);
    
    // Save spec
    mkdirSync(DESIGN_DIR, { recursive: true });
    const specPath = resolve(DESIGN_DIR, `${product.toLowerCase().replace(/ /g, '-')}-visual-spec.json`);
    writeFileSync(specPath, JSON.stringify(spec, null, 2), 'utf8');
    
    console.log('📐 Visual Design Specification Generated\n');
    
    console.log('Sourcing Guidelines:');
    spec.guidelines.sourcing.forEach(g => console.log(`  ${g}`));
    
    console.log('\n📐 Channel Specs:');
    Object.entries(spec.channels).forEach(([ch, brief]) => {
      console.log(`\n  ${ch.toUpperCase()} (${brief.visual.dimensions}):`);
      console.log(`    Style: ${brief.visual.style}`);
      console.log(`    Search: ${brief.prompts.keywords[0]}`);
      console.log(`    Avoid: ${brief.visual.avoid.join(', ')}`);
    });
    
    console.log(`\n✅ Full spec saved to: ${specPath}`);
    console.log('📌 Pass to Asset Generator Agent for image sourcing');
    
  } else if (args.includes('--brief')) {
    const product = args.includes('--product') ? args[args.indexOf('--product') + 1] : 'Docflow API';
    const segment = args.includes('--segment') ? args[args.indexOf('--segment') + 1] : 'contabilidad';
    const channel = args.includes('--channel') ? args[args.indexOf('--channel') + 1] : 'email';
    
    const briefing = generateVisualBriefing(product, segment, channel);
    console.log(JSON.stringify(briefing, null, 2));
    
  } else {
    console.log('Visual Designer Agent — Professional Image Specifications');
    console.log('\nUsage:');
    console.log('  --design --product "Docflow API" --segment contabilidad');
    console.log('  --brief --product "Docflow API" --segment contabilidad --channel email');
    console.log('\nSegments: contabilidad, administración, ventas');
    console.log('Channels: email, linkedin, x, facebook, telegram, discord');
  }
}

export { generateDesignSpec, generateVisualBriefing, VISUAL_FRAMEWORKS, STOCK_APIS };
main();
