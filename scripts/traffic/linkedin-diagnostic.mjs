#!/usr/bin/env node
/**
 * LinkedIn Token Diagnostic
 * Checks if the token has required scopes and can post using the official Posts API
 */

const token = process.env.LINKEDIN_ACCESS_TOKEN;

if (!token) {
  console.error('❌ LINKEDIN_ACCESS_TOKEN not set');
  console.error('Set it with: $env:LINKEDIN_ACCESS_TOKEN = "your-token"');
  process.exit(1);
}

console.log('=== LINKEDIN TOKEN DIAGNOSTIC ===\n');
console.log(`Token: ${token.substring(0, 20)}... (${token.length} chars)\n`);

// Step 1: Get Person ID
async function getPersonId() {
  console.log('Step 1: Getting person ID from /v2/me...');
  const resp = await fetch('https://api.linkedin.com/v2/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Linkedin-Version': '202506'
    }
  });
  
  const body = await resp.text();
  
  if (!resp.ok) {
    console.error(`❌ /v2/me failed: ${resp.status}`);
    console.error(`   Body: ${body.substring(0, 200)}`);
    return null;
  }
  
  const me = JSON.parse(body);
  console.log(`✅ Person ID: ${me.id}`);
  console.log(`   Name: ${me.firstName?.localized?.en_US || 'N/A'} ${me.lastName?.localized?.en_US || 'N/A'}`);
  return me.id;
}

// Step 2: Check email address (requires r_emailaddress)
async function checkEmail() {
  console.log('\nStep 2: Checking email access (r_emailaddress scope)...');
  const resp = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Linkedin-Version': '202506'
    }
  });
  
  const body = await resp.text();
  
  if (resp.ok) {
    const data = JSON.parse(body);
    const email = data.elements?.[0]?.['handle~']?.emailAddress;
    console.log(`✅ Email access: ${email || 'Available but empty'}`);
    return true;
  } else {
    console.log(`❌ Email access denied: ${resp.status}`);
    console.log(`   Body: ${body.substring(0, 200)}`);
    return false;
  }
}

// Step 3: Try to post using the REST API (requires w_member_social)
async function testPost(personId) {
  console.log('\nStep 3: Testing POST to /rest/posts (w_member_social scope)...');
  console.log('   This is the correct API per official docs (not deprecated /v2/ugcPosts)');
  
  const testText = '🚀 Test post from TigerLab automation ' + new Date().toISOString();
  
  const resp = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Linkedin-Version': '202506',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      author: `urn:li:person:${personId}`,
      commentary: testText,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false
    })
  });
  
  const body = await resp.text();
  
  console.log(`\n   Response: ${resp.status}`);
  console.log(`   Body: ${body.substring(0, 300)}`);
  
  if (resp.ok) {
    console.log('\n✅✅✅ SUCCESS! Post created!');
    console.log('   The token has w_member_social and works correctly.');
    return true;
  } else {
    console.log('\n❌ Post failed');
    try {
      const err = JSON.parse(body);
      console.log(`   Error Code: ${err.status || err.errorCode || err.serviceErrorCode || 'N/A'}`);
      console.log(`   Message: ${err.message || err.errorMessage || err.title || 'N/A'}`);
    } catch {}
    return false;
  }
}

// Step 4: Check organization access
async function checkOrganizationAccess() {
  const orgId = process.env.LINKEDIN_ORG_ID;
  if (!orgId) {
    console.log('\nStep 4: No LINKEDIN_ORG_ID set, skipping organization check');
    return;
  }
  
  console.log(`\nStep 4: Checking organization access for ${orgId}...`);
  const resp = await fetch(`https://api.linkedin.com/v2/organizationAcls?q=roleAssignee`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Linkedin-Version': '202506'
    }
  });
  
  const body = await resp.text();
  console.log(`   Response: ${resp.status}`);
  console.log(`   Body: ${body.substring(0, 300)}`);
}

async function main() {
  const personId = await getPersonId();
  if (!personId) {
    console.error('\n🚨 CRITICAL: Cannot get person ID. Token may be invalid or expired.');
    console.error('   Solutions:');
    console.error('   1. Generate a new token at https://www.linkedin.com/developers/tools/oauth/token-generator');
    console.error('   2. Ensure you selected r_basicprofile and w_member_social scopes');
    process.exit(1);
  }
  
  await checkEmail();
  const postSuccess = await testPost(personId);
  await checkOrganizationAccess();
  
  console.log('\n=== DIAGNOSTIC SUMMARY ===');
  if (postSuccess) {
    console.log('✅ Token is working correctly!');
    console.log('✅ LinkedIn publishing will work in autopilot');
  } else {
    console.log('❌ Token cannot post. This means:');
    console.log('   1. The token is missing w_member_social scope, OR');
    console.log('   2. The app is missing the "Share on LinkedIn" product permission');
    console.log('\n   To fix:');
    console.log('   1. Go to https://www.linkedin.com/developers/apps/');
    console.log('   2. Select your app: tiger-lab-social');
    console.log('   3. Go to "Products" tab');
    console.log('   4. Add "Share on LinkedIn" product');
    console.log('   5. Generate a new token with w_member_social scope');
    console.log('   6. Update the token in GitHub Secrets');
  }
}

main().catch(console.error);
