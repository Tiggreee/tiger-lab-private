#!/usr/bin/env node

/**
 * Campaign Validation & Testing Script
 * Validates all social packs before launch
 * 
 * Usage:
 *   npm run validate:campaigns
 *   npm run validate:campaigns -- --channel linkedin
 *   npm run validate:campaigns -- --campaign mcp-leads
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTBOX = path.join(__dirname, '..', 'ops', 'traffic', 'outbox');

class CampaignValidator {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      issues: []
    };
  }

  validate() {
    const files = fs.readdirSync(OUTBOX)
      .filter(f => f.startsWith('social-pack-') && f.endsWith('.json'));

    console.log(`\n📋 Validating ${files.length} campaigns...\n`);

    files.forEach(file => {
      const filepath = path.join(OUTBOX, file);
      const campaign = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      this.validateCampaign(campaign, file);
    });

    this.printReport();
  }

  validateCampaign(campaign, filename) {
    this.results.total++;
    const issues = [];
    const warnings = [];

    // 1. Metadata validation
    if (!campaign.campaign) issues.push('Missing campaign name');
    if (!campaign.topic) issues.push('Missing topic');
    if (!campaign.audience) issues.push('Missing audience');
    if (!campaign.offer) issues.push('Missing offer');

    // 2. Brand validation
    if (campaign.brand) {
      if (!campaign.brand.productName) issues.push('Brand: Missing productName');
      if (!campaign.brand.problemDetail) issues.push('Brand: Missing problemDetail');
      if (!campaign.brand.primaryOutcome) issues.push('Brand: Missing primaryOutcome');
    } else {
      warnings.push('Missing brand object');
    }

    // 3. Funnel validation
    if (campaign.funnel) {
      const dest = campaign.funnel.trafficDestination || '';
      const close = campaign.funnel.closeDestination || '';
      
      if (dest.includes('example.com') || dest === '') {
        issues.push('CRITICAL: trafficDestination is fake/empty');
      }
      if (close.includes('example.com') || close === '') {
        issues.push('CRITICAL: closeDestination is fake/empty');
      }
      if (!campaign.funnel.closeChannel) {
        issues.push('Missing closeChannel');
      }
    } else {
      issues.push('Missing funnel object');
    }

    // 4. Quality metrics
    if (campaign.quality) {
      if (!campaign.quality.averageScore) warnings.push('Missing averageScore');
      if (campaign.quality.averageScore < 70) {
        warnings.push(`Low score: ${campaign.quality.averageScore}`);
      }
    }

    // 5. Channels validation
    if (!campaign.channels) {
      issues.push('CRITICAL: Missing channels object');
    } else {
      const channels = Object.keys(campaign.channels);
      const requiredChannels = ['linkedin', 'x', 'facebook', 'telegram', 'discord'];
      
      requiredChannels.forEach(ch => {
        if (!channels.includes(ch)) {
          issues.push(`Missing channel: ${ch}`);
        } else {
          const channelData = campaign.channels[ch];
          
          // Check for content
          if (!channelData.copyPaste && !channelData.variants) {
            issues.push(`${ch}: Missing copyPaste or variants`);
          }
          
          // Check for score
          if (!channelData.selectedScore && channelData.selectedScore !== 0) {
            warnings.push(`${ch}: Missing selectedScore`);
          }
          
          // Check for UTM (can be in utm field or in copyPaste URL)
          const hasUTM = channelData.utm || 
                         (channelData.copyPaste && channelData.copyPaste.includes('utm_')) ||
                         (channelData.variants && Object.values(channelData.variants).some(v => v && v.includes('utm_')));
          
          if (!hasUTM) {
            warnings.push(`${ch}: Missing UTM tracking`);
          }
        }
      });
    }

    // Report
    const status = issues.length > 0 ? '❌' : (warnings.length > 0 ? '⚠️' : '✅');
    console.log(`${status} ${campaign.campaign}`);

    if (issues.length > 0) {
      issues.forEach(iss => console.log(`   ❌ ${iss}`));
      this.results.failed++;
    } else {
      this.results.passed++;
    }

    if (warnings.length > 0) {
      warnings.forEach(warn => console.log(`   ⚠️  ${warn}`));
      this.results.warnings += warnings.length;
    }

    if (issues.length > 0 || warnings.length > 0) {
      this.results.issues.push({
        campaign: campaign.campaign,
        file: filename,
        issues,
        warnings
      });
    }
  }

  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION REPORT');
    console.log('='.repeat(60));
    console.log(`Total:    ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    
    if (this.results.issues.length > 0) {
      console.log('\n📋 ISSUES SUMMARY:');
      this.results.issues.forEach(issue => {
        console.log(`\n  ${issue.campaign}:`);
        issue.issues.forEach(i => console.log(`    ❌ ${i}`));
        issue.warnings.forEach(w => console.log(`    ⚠️  ${w}`));
      });
    }

    console.log('\n' + '='.repeat(60));
    
    if (this.results.failed === 0) {
      console.log('✅ ALL CAMPAIGNS VALIDATED SUCCESSFULLY\n');
      process.exit(0);
    } else {
      console.log(`❌ ${this.results.failed} campaigns need fixes\n`);
      process.exit(1);
    }
  }
}

// Run validation
const validator = new CampaignValidator();
validator.validate();
