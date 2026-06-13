#!/usr/bin/env node
/**
 * LinkedIn API Exhaustive Tester
 * Tests every possible endpoint, version, header combination, and payload format
 * to find a working LinkedIn posting mechanism with the current token.
 */

const token = process.env.LINKEDIN_ACCESS_TOKEN;
const orgId = process.env.LINKEDIN_ORG_ID;

if (!token) {
  console.error('❌ LINKEDIN_ACCESS_TOKEN not set');
  process.exit(1);
}

const testText = '🚀 Test post from TigerLab automation engine ' + new Date().toISOString();

// API versions to test
const VERSIONS = [
  '202301', '202304', '202307', '202310',
  '202401', '202404', '202407', '202410',
  '202501', '202504', '202505', '202506'
];

// Base headers
const BASE_HEADERS = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

// Test results
const results = [];

async function testEndpoint(name, method, url, headers, body, expectError = false) {
  try {
    const response = await fetch(url, {
      method,
      headers: { ...BASE_HEADERS, ...headers },
      body: body ? JSON.stringify(body) : undefined
    });
    
    const responseBody = await response.text();
    const status = response.status;
    const isOk = response.ok;
    
    // Parse error details
    let errorCode = '';
    let errorMessage = '';
    try {
      const parsed = JSON.parse(responseBody);
      errorCode = parsed.status || parsed.errorCode || parsed.serviceErrorCode || '';
      errorMessage = parsed.message || parsed.errorMessage || parsed.title || '';
    } catch {}
    
    const result = {
      name,
      method,
      url,
      status,
      isOk,
      errorCode,
      errorMessage: errorMessage.substring(0, 200),
      bodyPreview: responseBody.substring(0, 300)
    };
    
    results.push(result);
    
    if (isOk) {
      console.log(`✅ ${name}: ${status} OK`);
      return { success: true, data: result };
    } else {
      console.log(`❌ ${name}: ${status} ${errorCode} - ${errorMessage.substring(0, 100)}`);
      return { success: false, data: result };
    }
  } catch (error) {
    const result = {
      name,
      method,
      url,
      status: 0,
      isOk: false,
      errorCode: 'NETWORK_ERROR',
      errorMessage: error.message,
      bodyPreview: ''
    };
    results.push(result);
    console.log(`❌ ${name}: NETWORK ERROR - ${error.message}`);
    return { success: false, data: result };
  }
}

async function getPersonId() {
  const result = await testEndpoint(
    'Get Person ID (v2/me)',
    'GET',
    'https://api.linkedin.com/v2/me',
    { 'X-Restli-Protocol-Version': '2.0.0' }
  );
  
  if (result.success) {
    try {
      const parsed = JSON.parse(result.data.bodyPreview);
      return parsed.id;
    } catch {}
  }
  return null;
}

async function getOrganizationDetails() {
  if (!orgId) return null;
  
  const result = await testEndpoint(
    'Get Organization Details',
    'GET',
    `https://api.linkedin.com/v2/organizations/${orgId}`,
    { 'X-Restli-Protocol-Version': '2.0.0' }
  );
  
  return result.success;
}

async function testAllLinkedInApproaches() {
  console.log('=== LINKEDIN API EXHAUSTIVE TESTER ===\n');
  console.log(`Token: ${token.substring(0, 20)}...`);
  console.log(`Org ID: ${orgId || 'not set'}`);
  console.log(`Test text: ${testText}\n`);
  
  // 1. Basic token validation
  console.log('--- 1. TOKEN VALIDATION ---');
  const personId = await getPersonId();
  
  if (!personId) {
    console.log('\n🚨 CRITICAL: Cannot get person ID. Token may be invalid or expired.\n');
  } else {
    console.log(`✅ Person ID: ${personId}\n`);
  }
  
  // 2. Test organization access
  if (orgId) {
    console.log('--- 2. ORGANIZATION ACCESS ---');
    const orgOk = await getOrganizationDetails();
    console.log(`Organization access: ${orgOk ? '✅' : '❌'}\n`);
  }
  
  // 3. Test ALL UGC Posts versions
  console.log('--- 3. UGC POSTS API (All Versions) ---');
  for (const version of VERSIONS) {
    if (personId) {
      await testEndpoint(
        `UGC Posts v${version} (Personal)`,
        'POST',
        'https://api.linkedin.com/v2/ugcPosts',
        {
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': version
        },
        {
          author: `urn:li:person:${personId}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: testText },
              shareMediaCategory: 'NONE'
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
          }
        }
      );
    }
    
    if (orgId) {
      await testEndpoint(
        `UGC Posts v${version} (Organization)`,
        'POST',
        'https://api.linkedin.com/v2/ugcPosts',
        {
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': version
        },
        {
          author: `urn:li:organization:${orgId}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: testText },
              shareMediaCategory: 'NONE'
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
          }
        }
      );
    }
  }
  
  // 4. Test REST Posts API (all versions)
  console.log('\n--- 4. REST POSTS API (All Versions) ---');
  for (const version of VERSIONS) {
    if (personId) {
      await testEndpoint(
        `REST Posts v${version} (Personal)`,
        'POST',
        'https://api.linkedin.com/rest/posts',
        {
          'LinkedIn-Version': version,
          'X-Restli-Protocol-Version': '2.0.0'
        },
        {
          author: `urn:li:person:${personId}`,
          commentary: testText,
          visibility: 'PUBLIC',
          distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: []
          },
          lifecycleState: 'PUBLISHED'
        }
      );
    }
  }
  
  // 5. Test Shares API
  console.log('\n--- 5. SHARES API ---');
  for (const version of ['202401', '202404', '202407', '202501', '202504']) {
    if (personId) {
      await testEndpoint(
        `Shares API v${version} (Personal)`,
        'POST',
        'https://api.linkedin.com/v2/shares',
        {
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': version
        },
        {
          owner: `urn:li:person:${personId}`,
          text: { text: testText }
        }
      );
    }
  }
  
  // 6. Test without Restli protocol
  console.log('\n--- 6. WITHOUT RESTLI PROTOCOL ---');
  if (personId) {
    await testEndpoint(
      'UGC Posts (no Restli, Personal)',
      'POST',
      'https://api.linkedin.com/v2/ugcPosts',
      {
        'LinkedIn-Version': '202504'
      },
      {
        author: `urn:li:person:${personId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: testText },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      }
    );
  }
  
  // 7. Test with different content types
  console.log('\n--- 7. DIFFERENT CONTENT TYPES ---');
  if (personId) {
    // With JSON-LD
    await testEndpoint(
      'UGC Posts (JSON-LD format)',
      'POST',
      'https://api.linkedin.com/v2/ugcPosts',
      {
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202504'
      },
      {
        '@context': 'https://www.linkedin.com/ns/ugc#',
        author: `urn:li:person:${personId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: testText },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      }
    );
  }
  
  // 8. Test OAuth endpoints
  console.log('\n--- 8. TOKEN INFO ENDPOINTS ---');
  await testEndpoint(
    'Token Introspection',
    'GET',
    'https://api.linkedin.com/v2/me?projection=(id,firstName,lastName)',
    { 'X-Restli-Protocol-Version': '2.0.0' }
  );
  
  // 9. Test Organization Acls
  if (orgId) {
    console.log('\n--- 9. ORGANIZATION ACLS ---');
    await testEndpoint(
      'Organization ACLs',
      'GET',
      `https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&roleAssignee=urn:li:person:${personId}&organization=urn:li:organization:${orgId}`,
      { 'X-Restli-Protocol-Version': '2.0.0' }
    );
  }
  
  // 10. Test with 2-legged OAuth approach
  console.log('\n--- 10. ALTERNATIVE APPROACHES ---');
  
  // Try v2/activities
  if (personId) {
    await testEndpoint(
      'Activities API',
      'POST',
      'https://api.linkedin.com/v2/activities',
      {
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202504'
      },
      {
        actor: `urn:li:person:${personId}`,
        content: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: testText },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      }
    );
  }
  
  // 11. Test network/updates
  if (personId) {
    await testEndpoint(
      'Network Updates API',
      'POST',
      'https://api.linkedin.com/v1/people/~/shares',
      {
        'Content-Type': 'application/json',
        'x-li-format': 'json'
      },
      {
        content: {
          title: 'TigerLab Update',
          description: testText,
          'submitted-url': 'https://tigerlab.dev',
          'submitted-image-url': 'https://tigerlab.dev/logo.png'
        },
        visibility: { code: 'anyone' }
      }
    );
  }
  
  // 12. Test with plain text instead of JSON
  console.log('\n--- 12. DIFFERENT PAYLOAD FORMATS ---');
  if (personId) {
    await testEndpoint(
      'UGC Posts (XML format attempt)',
      'POST',
      'https://api.linkedin.com/v2/ugcPosts',
      {
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/xml',
        'LinkedIn-Version': '202504'
      },
      `<?xml version="1.0" encoding="UTF-8"?>
      <ugcPost>
        <author>urn:li:person:${personId}</author>
        <lifecycleState>PUBLISHED</lifecycleState>
        <visibility>PUBLIC</visibility>
      </ugcPost>`
    );
  }
  
  // 13. Try with application/x-www-form-urlencoded
  if (personId) {
    const formData = new URLSearchParams();
    formData.append('author', `urn:li:person:${personId}`);
    formData.append('lifecycleState', 'PUBLISHED');
    formData.append('visibility', 'PUBLIC');
    
    await testEndpoint(
      'UGC Posts (form-urlencoded)',
      'POST',
      'https://api.linkedin.com/v2/ugcPosts',
      {
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        'LinkedIn-Version': '202504'
      },
      formData.toString()
    );
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  const successful = results.filter(r => r.isOk);
  const failed = results.filter(r => !r.isOk);
  
  console.log(`\nTotal tests: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ WORKING ENDPOINTS:');
    successful.forEach(r => {
      console.log(`  - ${r.name}: ${r.status}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ FAILED ENDPOINTS (grouped by error):');
    const errorGroups = {};
    failed.forEach(r => {
      const key = `${r.status} ${r.errorCode}`;
      if (!errorGroups[key]) errorGroups[key] = [];
      errorGroups[key].push(r.name);
    });
    
    Object.entries(errorGroups).forEach(([error, names]) => {
      console.log(`\n  ${error} (${names.length} tests):`);
      names.forEach(n => console.log(`    - ${n}`));
    });
  }
  
  // Save results
  const fs = await import('fs');
  const reportPath = `ops/runtime/linkedin-api-test-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify({
    testedAt: new Date().toISOString(),
    token: token.substring(0, 20) + '...',
    personId,
    orgId,
    summary: { total: results.length, successful: successful.length, failed: failed.length },
    results
  }, null, 2));
  
  console.log(`\n📄 Full report saved to: ${reportPath}`);
  
  return { successful, failed, personId };
}

testAllLinkedInApproaches().catch(console.error);
