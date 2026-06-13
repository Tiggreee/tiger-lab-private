#!/usr/bin/env node
/**
 * Campaign Router — engine/campaigns/campaign-router.mjs
 * CORE ENGINE. Zero GitHub dependency. Portable.
 * 
 * Routes campaigns to their respective channels with platform-specific adaptations.
 * Each channel gets: optimized copy length, format, image sizing, CTA adjustment.
 */

const CHANNEL_LIMITS = {
  email:    { maxChars: 5000, format: 'html',    supportsImages: true,  supportsLinks: true },
  linkedin: { maxChars: 3000, format: 'text',    supportsImages: true,  supportsLinks: true },
  x:        { maxChars: 280,  format: 'text',    supportsImages: true,  supportsLinks: true },
  facebook: { maxChars: 2000, format: 'text',    supportsImages: true,  supportsLinks: true },
  telegram: { maxChars: 4096, format: 'markdown', supportsImages: false, supportsLinks: true },
  discord:  { maxChars: 2000, format: 'markdown', supportsImages: true,  supportsLinks: true },
  whatsapp: { maxChars: 1000, format: 'text',    supportsImages: true,  supportsLinks: true }
};

function adaptCopy(text, channel, campaignConfig) {
  const limit = CHANNEL_LIMITS[channel]?.maxChars || 2000;
  const { headline, bodyCopy, ctaText, ctaUrl, productName } = campaignConfig;
  
  const templates = {
    email: () => bodyCopy,
    
    linkedin: () => {
      let copy = `🔥 ${headline}\n\n${bodyCopy}\n\n`;
      if (campaignConfig.bullets?.length) {
        copy += campaignConfig.bullets.map(b => `✅ ${b}`).join('\n') + '\n\n';
      }
      copy += `💡 ${ctaText}: ${ctaUrl}`;
      return copy;
    },
    
    x: () => {
      let copy = `🔥 ${headline}\n\n${bodyCopy?.substring(0, 100)}...\n\n${ctaUrl}`;
      if (copy.length > 280) copy = copy.substring(0, 277) + '...';
      return copy;
    },
    
    facebook: () => {
      let copy = `🔥 ${headline}\n\n`;
      if (campaignConfig.bullets?.length) {
        copy += campaignConfig.bullets.map(b => `✅ ${b}`).join('\n') + '\n\n';
      }
      copy += `${bodyCopy?.substring(0, Math.min(150, limit - copy.length - 100))}...\n\n${ctaUrl}`;
      return copy;
    },
    
    telegram: () => {
      let copy = `*${productName}*\n\n${headline}\n\n${bodyCopy?.substring(0, 200)}...\n\n[${ctaText}](${ctaUrl})`;
      return copy;
    },
    
    discord: () => `**${productName}**\n\n${headline}\n\n${bodyCopy?.substring(0, Math.min(300, limit - 100))}...\n\n${ctaUrl}`,
    
    whatsapp: () => `🔥 *${productName}*\n\n${headline}\n\n${bodyCopy?.substring(0, 200)}\n\n${ctaUrl}`
  };
  
  const adapted = (templates[channel] || templates.linkedin)();
  return adapted.length > limit ? adapted.substring(0, limit - 3) + '...' : adapted;
}

function adaptCampaign(campaign, channels) {
  const adapted = { ...campaign, channels: {} };
  
  for (const channel of channels) {
    const limits = CHANNEL_LIMITS[channel];
    if (!limits) {
      adapted.channels[channel] = { error: `Unsupported channel: ${channel}` };
      continue;
    }
    
    adapted.channels[channel] = {
      copy: adaptCopy(null, channel, campaign.config),
      format: limits.format,
      maxChars: limits.maxChars,
      supportsImages: limits.supportsImages,
      supportsLinks: limits.supportsLinks,
      image: campaign.config.imageUrl || '',
      cta: campaign.config.ctaUrl || ''
    };
  }
  
  return adapted;
}

function main() {
  const args = process.argv.slice(2);
  const campaignPath = args.includes('--campaign') ? args[args.indexOf('--campaign') + 1] : null;
  const channels = args.includes('--channels')
    ? args[args.indexOf('--channels') + 1].split(',')
    : ['email', 'linkedin', 'facebook', 'x', 'telegram', 'discord'];
  
  if (!campaignPath) {
    console.log('=== CHANNEL LIMITS ===');
    Object.entries(CHANNEL_LIMITS).forEach(([ch, limits]) => {
      console.log(`${ch}: ${limits.maxChars} chars, ${limits.format}, images:${limits.supportsImages}`);
    });
    return;
  }
  
  try {
    const { readFileSync } = require('node:fs');
    const campaign = JSON.parse(readFileSync(campaignPath, 'utf8'));
    const adapted = adaptCampaign(campaign, channels);
    
    console.log(`✅ Campaign routed to: ${Object.keys(adapted.channels).join(', ')}`);
    Object.entries(adapted.channels).forEach(([ch, data]) => {
      console.log(`  ${ch}: ${data.copy.length} chars, ${data.format}`);
    });
  } catch (e) {
    console.error(`❌ Failed: ${e.message}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
