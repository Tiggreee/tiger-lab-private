import { HttpError } from '../errors';
import { LinkedInOAuthService } from '../../bootstrap/linkedin-oauth-service';

export class LinkedInIntegrationController {
  constructor(private readonly linkedInOAuthService: LinkedInOAuthService) {}

  public async startOAuth(): Promise<{
    status: 'ok';
    action: 'linkedin-oauth-start';
    result: {
      authorizeUrl: string;
      state: string;
      expiresAt: string;
    };
  }> {
    const result = await this.linkedInOAuthService.startAuthorizationFlow();
    return {
      status: 'ok',
      action: 'linkedin-oauth-start',
      result
    };
  }

  public async handleOAuthCallback(query: URLSearchParams): Promise<{
    status: 'ok';
    action: 'linkedin-oauth-callback';
    result: {
      connected: true;
      connectedAt: string;
      expiresAt?: string;
    };
  }> {
    const errorCode = String(query.get('error') || '').trim();
    const errorDescriptionRaw = String(query.get('error_description') || '').trim();
    if (errorCode) {
      const errorDescription = errorDescriptionRaw
        .replaceAll('&quot;', '"')
        .replaceAll('+', ' ')
        .trim();

      throw new HttpError(
        403,
        errorDescription
          ? `LinkedIn OAuth error (${errorCode}): ${errorDescription}`
          : `LinkedIn OAuth error (${errorCode}).`
      );
    }

    const code = String(query.get('code') || '').trim();
    const state = String(query.get('state') || '').trim();

    if (!code) {
      throw new HttpError(400, 'Missing code query parameter.');
    }

    if (!state) {
      throw new HttpError(400, 'Missing state query parameter.');
    }

    const result = await this.linkedInOAuthService.handleAuthorizationCallback(code, state);

    return {
      status: 'ok',
      action: 'linkedin-oauth-callback',
      result
    };
  }

  public async getCampaignAnalytics(query: URLSearchParams): Promise<{
    status: 'ok';
    action: 'linkedin-campaign-analytics';
    result: {
      campaignId: string;
      startDate: string;
      endDate: string;
      totals: {
        impressions: number;
        clicks: number;
        ctr: number;
        spend: number;
        conversions: number;
      };
      rows: readonly Record<string, unknown>[];
    };
  }> {
    const campaignId = String(query.get('campaignId') || process.env.LINKEDIN_DEFAULT_CAMPAIGN_ID || '').trim();
    if (!campaignId) {
      throw new HttpError(400, 'campaignId query parameter is required.');
    }

    const endDate = String(query.get('endDate') || new Date().toISOString().slice(0, 10)).trim();
    const startDateDefault = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const startDate = String(query.get('startDate') || startDateDefault).trim();

    const result = await this.linkedInOAuthService.getCampaignAnalytics({
      campaignId,
      startDate,
      endDate
    });

    return {
      status: 'ok',
      action: 'linkedin-campaign-analytics',
      result
    };
  }
}
