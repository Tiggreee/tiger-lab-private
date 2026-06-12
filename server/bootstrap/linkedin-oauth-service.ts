import { randomUUID } from 'node:crypto';
import { HttpError } from '../http/errors';
import { readRuntimeState, updateRuntimeState } from '../../src/shared/infrastructure/persistence/runtime-state';

const AUTH_BASE_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const ANALYTICS_URL = 'https://api.linkedin.com/rest/adAnalytics';

export interface LinkedInOAuthStartResult {
  readonly authorizeUrl: string;
  readonly state: string;
  readonly expiresAt: string;
}

export interface LinkedInOAuthCallbackResult {
  readonly connected: true;
  readonly connectedAt: string;
  readonly expiresAt?: string;
}

export interface LinkedInCampaignAnalyticsInput {
  readonly campaignId: string;
  readonly startDate: string;
  readonly endDate: string;
}

export interface LinkedInCampaignAnalyticsResult {
  readonly campaignId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly totals: {
    readonly impressions: number;
    readonly clicks: number;
    readonly ctr: number;
    readonly spend: number;
    readonly conversions: number;
  };
  readonly rows: readonly Record<string, unknown>[];
}

function requiredEnv(name: string): string {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new HttpError(500, `Missing required environment variable: ${name}`);
  }

  return value;
}

function toLinkedInDateTuple(dateText: string): string {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `Invalid date: ${dateText}`);
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `(year:${year},month:${month},day:${day})`;
}

function analyticsBaseUrl(campaignId: string): string {
  const campaignUrn = encodeURIComponent(`urn:li:sponsoredCampaign:${campaignId}`);
  return `${ANALYTICS_URL}?q=analytics&pivot=CAMPAIGN&timeGranularity=DAILY&campaigns=List(${campaignUrn})`;
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function defaultLinkedInVersion(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

function previousLinkedInVersion(version: string): string {
  const year = Number(version.slice(0, 4));
  const month = Number(version.slice(4, 6));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return defaultLinkedInVersion(new Date(Date.now() - 31 * 24 * 60 * 60 * 1000));
  }

  const previous = new Date(Date.UTC(year, month - 2, 1));
  return defaultLinkedInVersion(previous);
}

function normalizeLinkedInVersion(value: string): string | undefined {
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 6) {
    return digits.slice(0, 6);
  }

  return undefined;
}

function resolveLinkedInVersion(): string {
  const raw = String(process.env.LINKEDIN_API_VERSION || '').trim();
  return normalizeLinkedInVersion(raw) || defaultLinkedInVersion();
}

function resolveScopeList(): string {
  const raw = String(process.env.LINKEDIN_OAUTH_SCOPES || '').trim();
  if (!raw) {
    return 'r_ads_reporting w_organization_social rw_organization_admin';
  }

  return raw;
}

function conversionTotal(row: Record<string, unknown>): number {
  let total = 0;
  for (const [key, value] of Object.entries(row)) {
    if (key.toLowerCase().includes('conversion')) {
      total += asNumber(value);
    }
  }

  return total;
}

export class LinkedInOAuthService {
  constructor(
    private readonly now: () => Date = () => new Date(),
    private readonly idGenerator: () => string = () => randomUUID().replace(/-/g, '')
  ) {}

  public async startAuthorizationFlow(): Promise<LinkedInOAuthStartResult> {
    const clientId = requiredEnv('LINKEDIN_CLIENT_ID');
    const redirectUri = requiredEnv('LINKEDIN_REDIRECT_URI');
    const state = this.idGenerator();
    const now = this.now();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    await updateRuntimeState((current) => ({
      ...current,
      linkedinOAuth: {
        ...current.linkedinOAuth,
        pendingState: {
          state,
          createdAt: now.toISOString(),
          expiresAt
        },
        updatedAt: now.toISOString()
      }
    }));

    const url = new URL(AUTH_BASE_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('scope', resolveScopeList());

    return {
      authorizeUrl: url.toString(),
      state,
      expiresAt
    };
  }

  public async handleAuthorizationCallback(code: string, state: string): Promise<LinkedInOAuthCallbackResult> {
    if (!code.trim()) {
      throw new HttpError(400, 'Missing LinkedIn OAuth code.');
    }
    if (!state.trim()) {
      throw new HttpError(400, 'Missing LinkedIn OAuth state.');
    }

    const runtime = await readRuntimeState();
    const pendingState = runtime.linkedinOAuth.pendingState;
    if (!pendingState) {
      throw new HttpError(409, 'No OAuth session is pending. Start OAuth again.');
    }

    const now = this.now();
    if (pendingState.state !== state) {
      throw new HttpError(409, 'LinkedIn OAuth state mismatch. Start OAuth again.');
    }

    if (new Date(pendingState.expiresAt).getTime() < now.getTime()) {
      throw new HttpError(409, 'LinkedIn OAuth state expired. Start OAuth again.');
    }

    const payload = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: requiredEnv('LINKEDIN_CLIENT_ID'),
      client_secret: requiredEnv('LINKEDIN_CLIENT_SECRET'),
      redirect_uri: requiredEnv('LINKEDIN_REDIRECT_URI')
    });

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: payload.toString()
    });

    const bodyText = await response.text();
    if (!response.ok) {
      throw new HttpError(502, `LinkedIn token exchange failed (${response.status}): ${bodyText}`);
    }

    const parsed = JSON.parse(bodyText) as {
      access_token?: string;
      expires_in?: number;
      token_type?: string;
      refresh_token?: string;
    };

    if (!parsed.access_token) {
      throw new HttpError(502, 'LinkedIn token exchange response is missing access_token.');
    }

    const expiresAt = Number.isFinite(parsed.expires_in)
      ? new Date(now.getTime() + Number(parsed.expires_in) * 1000).toISOString()
      : undefined;

    await updateRuntimeState((current) => ({
      ...current,
      linkedinOAuth: {
        ...current.linkedinOAuth,
        accessToken: parsed.access_token,
        tokenType: parsed.token_type || 'Bearer',
        expiresAt,
        refreshToken: parsed.refresh_token,
        orgId: String(process.env.LINKEDIN_ORG_ID || current.linkedinOAuth.orgId || '').trim() || undefined,
        adAccountId:
          String(process.env.LINKEDIN_AD_ACCOUNT_ID || current.linkedinOAuth.adAccountId || '').trim() || undefined,
        connectedAt: current.linkedinOAuth.connectedAt || now.toISOString(),
        updatedAt: now.toISOString(),
        pendingState: undefined
      }
    }));

    return {
      connected: true,
      connectedAt: now.toISOString(),
      expiresAt
    };
  }

  public async getCampaignAnalytics(
    input: LinkedInCampaignAnalyticsInput
  ): Promise<LinkedInCampaignAnalyticsResult> {
    const token = await this.resolveAccessToken();
    const campaignId = input.campaignId.trim();
    if (!campaignId) {
      throw new HttpError(400, 'campaignId is required.');
    }

    const requestedVersion = resolveLinkedInVersion();
    const dateRangeValue = `(start:${toLinkedInDateTuple(input.startDate)},end:${toLinkedInDateTuple(input.endDate)})`;

    const analyticsRequest = async (version: string, includeDateRange: boolean): Promise<Response> => {
      let url = analyticsBaseUrl(campaignId);
      if (includeDateRange) {
        url += `&dateRange=${dateRangeValue}`;
      }

      return fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'LinkedIn-Version': version,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
    };

    let response = await analyticsRequest(requestedVersion, true);
    let bodyText = await response.text();
    if (!response.ok && response.status === 426 && bodyText.includes('NONEXISTENT_VERSION')) {
      const fallbackVersion = previousLinkedInVersion(requestedVersion);
      response = await analyticsRequest(fallbackVersion, true);
      bodyText = await response.text();
    }

    if (!response.ok && response.status === 400 && bodyText.includes('dateRange')) {
      response = await analyticsRequest(requestedVersion, false);
      bodyText = await response.text();
      if (!response.ok && response.status === 426 && bodyText.includes('NONEXISTENT_VERSION')) {
        const fallbackVersion = previousLinkedInVersion(requestedVersion);
        response = await analyticsRequest(fallbackVersion, false);
        bodyText = await response.text();
      }
    }

    if (!response.ok) {
      throw new HttpError(502, `LinkedIn analytics request failed (${response.status}): ${bodyText}`);
    }

    const parsed = JSON.parse(bodyText) as { elements?: Record<string, unknown>[] };
    const rows = Array.isArray(parsed.elements) ? parsed.elements : [];

    const totals = rows.reduce(
      (accumulator, row) => {
        const impressions = asNumber(row.impressions);
        const clicks = asNumber(row.clicks);
        const spend = asNumber(row.costInLocalCurrency) || asNumber(row.costInUsd);

        return {
          impressions: accumulator.impressions + impressions,
          clicks: accumulator.clicks + clicks,
          spend: accumulator.spend + spend,
          conversions: accumulator.conversions + conversionTotal(row)
        };
      },
      {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0
      }
    );

    return {
      campaignId,
      startDate: input.startDate,
      endDate: input.endDate,
      totals: {
        impressions: totals.impressions,
        clicks: totals.clicks,
        ctr: totals.impressions > 0 ? roundTo((totals.clicks / totals.impressions) * 100, 2) : 0,
        spend: roundTo(totals.spend, 2),
        conversions: roundTo(totals.conversions, 2)
      },
      rows
    };
  }

  private async resolveAccessToken(): Promise<string> {
    const runtime = await readRuntimeState();
    const runtimeToken = String(runtime.linkedinOAuth.accessToken || '').trim();
    if (runtimeToken) {
      const expiresAt = runtime.linkedinOAuth.expiresAt;
      if (!expiresAt || new Date(expiresAt).getTime() > this.now().getTime() + 60_000) {
        return runtimeToken;
      }
    }

    const envToken = String(process.env.LINKEDIN_ACCESS_TOKEN || '').trim();
    if (envToken) {
      return envToken;
    }

    throw new HttpError(401, 'LinkedIn is not connected. Run OAuth flow or configure LINKEDIN_ACCESS_TOKEN.');
  }
}
