import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeState = {
  leads: {},
  leadScores: {},
  payments: {},
  accounts: {},
  assets: {},
  publications: {},
  invoices: {},
  invoiceMcpAudits: {},
  linkedinOAuth: {}
};

vi.mock('../../../src/shared/infrastructure/persistence/runtime-state', () => ({
  readRuntimeState: vi.fn(async () => runtimeState),
  updateRuntimeState: vi.fn(async (mutator: (state: typeof runtimeState) => typeof runtimeState) => {
    const next = mutator(runtimeState);
    Object.assign(runtimeState, next);
  })
}));

import { LinkedInOAuthService } from '../../../server/bootstrap/linkedin-oauth-service';

describe('LinkedInOAuthService', () => {
  const originalEnv = {
    LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
    LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
    LINKEDIN_REDIRECT_URI: process.env.LINKEDIN_REDIRECT_URI,
    LINKEDIN_ACCESS_TOKEN: process.env.LINKEDIN_ACCESS_TOKEN,
    LINKEDIN_ORG_ID: process.env.LINKEDIN_ORG_ID,
    LINKEDIN_AD_ACCOUNT_ID: process.env.LINKEDIN_AD_ACCOUNT_ID
  };

  beforeEach(() => {
    runtimeState.linkedinOAuth = {};

    process.env.LINKEDIN_CLIENT_ID = 'linkedin-client-id';
    process.env.LINKEDIN_CLIENT_SECRET = 'linkedin-client-secret';
    process.env.LINKEDIN_REDIRECT_URI = 'http://localhost:8787/integrations/linkedin/oauth/callback';
    process.env.LINKEDIN_ORG_ID = '123456';
    process.env.LINKEDIN_AD_ACCOUNT_ID = '7890';
    delete process.env.LINKEDIN_ACCESS_TOKEN;

    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.LINKEDIN_CLIENT_ID = originalEnv.LINKEDIN_CLIENT_ID;
    process.env.LINKEDIN_CLIENT_SECRET = originalEnv.LINKEDIN_CLIENT_SECRET;
    process.env.LINKEDIN_REDIRECT_URI = originalEnv.LINKEDIN_REDIRECT_URI;
    process.env.LINKEDIN_ACCESS_TOKEN = originalEnv.LINKEDIN_ACCESS_TOKEN;
    process.env.LINKEDIN_ORG_ID = originalEnv.LINKEDIN_ORG_ID;
    process.env.LINKEDIN_AD_ACCOUNT_ID = originalEnv.LINKEDIN_AD_ACCOUNT_ID;
  });

  it('creates authorization url and persists pending state', async () => {
    const service = new LinkedInOAuthService(
      () => new Date('2026-06-11T21:30:00.000Z'),
      () => 'state-123'
    );

    const result = await service.startAuthorizationFlow();

    expect(result.state).toBe('state-123');
    expect(result.authorizeUrl).toContain('client_id=linkedin-client-id');
    expect(runtimeState.linkedinOAuth).toHaveProperty('pendingState');
  });

  it('exchanges callback code and stores access token in runtime state', async () => {
    runtimeState.linkedinOAuth = {
      pendingState: {
        state: 'state-abc',
        createdAt: '2026-06-11T21:30:00.000Z',
        expiresAt: '2026-06-11T21:40:00.000Z'
      }
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          access_token: 'runtime-access-token',
          expires_in: 3600,
          token_type: 'Bearer'
        })
    } as Response);

    const service = new LinkedInOAuthService(() => new Date('2026-06-11T21:31:00.000Z'));
    const result = await service.handleAuthorizationCallback('auth-code', 'state-abc');

    expect(result.connected).toBe(true);
    expect(runtimeState.linkedinOAuth).toMatchObject({
      accessToken: 'runtime-access-token',
      tokenType: 'Bearer',
      orgId: '123456',
      adAccountId: '7890'
    });
    expect(runtimeState.linkedinOAuth.pendingState).toBeUndefined();
  });

  it('aggregates campaign analytics from linkedin rows', async () => {
    runtimeState.linkedinOAuth = {
      accessToken: 'runtime-token',
      expiresAt: '2099-01-01T00:00:00.000Z'
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          elements: [
            {
              impressions: 100,
              clicks: 10,
              costInLocalCurrency: 15.25,
              conversions: 2
            },
            {
              impressions: 50,
              clicks: 4,
              costInLocalCurrency: 7.5,
              externalWebsiteConversions: 1
            }
          ]
        })
    } as Response);

    const service = new LinkedInOAuthService();
    const result = await service.getCampaignAnalytics({
      campaignId: '1234',
      startDate: '2026-06-01',
      endDate: '2026-06-07'
    });

    expect(result.totals.impressions).toBe(150);
    expect(result.totals.clicks).toBe(14);
    expect(result.totals.ctr).toBe(9.33);
    expect(result.totals.spend).toBe(22.75);
    expect(result.totals.conversions).toBe(3);
  });
});
