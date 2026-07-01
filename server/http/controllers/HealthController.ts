import { HealthResponse } from '../contracts/responses/health-response';
import { readRuntimeState } from '../../../src/shared/infrastructure/persistence/runtime-state';
import { checkPostgresConnection, isPostgresAvailable } from '../../../src/shared/infrastructure/persistence/postgres-runtime-store';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function hasValue(name: string): boolean {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

function shouldRunActiveProbes(): boolean {
  return process.env.HEALTHCHECK_ACTIVE_PROBES === 'true';
}

function resolveInvoiceProvider(): string {
  return (process.env.INVOICE_PROVIDER || 'timbox').trim().toLowerCase();
}

function hasCfdiProviderConfig(): boolean {
  const provider = resolveInvoiceProvider();
  if (provider === 'timbox') {
    return (
      hasValue('TIMBOX_ADAPTER_URL') &&
      hasValue('TIMBOX_USERNAME') &&
      hasValue('TIMBOX_PASSWORD') &&
      (hasValue('TIMBOX_SXML_BASE64') || hasValue('TIMBOX_SXML_PATH'))
    );
  }

  if (provider === 'facturama') {
    return hasValue('FACTURAMA_API_KEY') && hasValue('FACTURAMA_API_SECRET');
  }

  return false;
}

function hasInvoiceEmailConfig(): boolean {
  return hasValue('RESEND_API_KEY') && hasValue('BILLING_FROM_EMAIL');
}

function isMcpPacEnabled(): boolean {
  return (process.env.MCP_PAC_ENABLED || 'true').trim().toLowerCase() !== 'false';
}

async function probeUrl(url: string): Promise<{ ok: boolean; detail: string }> {
  const timeoutMs = Number(process.env.HEALTHCHECK_HTTP_TIMEOUT_MS || 2_000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    return {
      ok: response.ok,
      detail: response.ok ? `HTTP ${response.status}` : `HTTP ${response.status}`
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, detail: `Timeout after ${timeoutMs}ms` };
    }
    return {
      ok: false,
      detail: error instanceof Error ? error.message : 'Probe failed.'
    };
  } finally {
    clearTimeout(timeout);
  }
}

export class HealthController {
  public async getHealth(): Promise<HealthResponse> {
    const dependencies: HealthResponse['dependencies'] = {
      apiKeyRegistry: {
        status: isProduction() ? (hasValue('API_KEY_REGISTRY') ? 'up' : 'down') : 'skipped',
        detail: isProduction() ? 'API_KEY_REGISTRY required in production.' : 'Not required outside production.'
      },
      paymentGateway: {
        status: isProduction() ? (hasValue('PAYMENT_GATEWAY_CONFIRM_URL') ? 'up' : 'down') : 'skipped',
        detail: 'PAYMENT_GATEWAY_CONFIRM_URL'
      },
      entitlementApi: {
        status: isProduction() ? (hasValue('ENTITLEMENT_API_URL') ? 'up' : 'down') : 'skipped',
        detail: 'ENTITLEMENT_API_URL'
      },
      contentPublisherApi: {
        status: isProduction() ? (hasValue('CONTENT_PUBLISHER_API_URL') ? 'up' : 'down') : 'skipped',
        detail: 'CONTENT_PUBLISHER_API_URL'
      },
      paypalConfig: {
        status: 'skipped',
        detail: 'PayPal optional unless checkout sessions are enabled.'
      },
      runtimePersistence: {
        status: 'up'
      },
      cfdiProvider: {
        status: isProduction() ? (hasCfdiProviderConfig() ? 'up' : 'down') : 'skipped',
        detail: `CFDI provider (${resolveInvoiceProvider()}) credentials required for timbrado in production.`
      },
      invoiceEmailDelivery: {
        status: isProduction() ? (hasInvoiceEmailConfig() ? 'up' : 'down') : 'skipped',
        detail: 'Resend API key and BILLING_FROM_EMAIL required for invoice notifications.'
      },
      mcpPacLayer: {
        status: isMcpPacEnabled() ? 'up' : 'down',
        detail: isMcpPacEnabled()
          ? 'MCP PAC auditor enabled for secure execution, benchmark and traceability.'
          : 'MCP_PAC_ENABLED=false disables PAC benchmark/audit guardrails.'
      },
      postgres: {
        status: 'skipped',
        detail: 'DATABASE_URL not configured.'
      }
    };

    const paypalEnabled = hasValue('PAYPAL_CLIENT_ID') || hasValue('PAYPAL_CLIENT_SECRET');
    if (paypalEnabled) {
      const paypalReady =
        hasValue('PAYPAL_CLIENT_ID') &&
        hasValue('PAYPAL_CLIENT_SECRET') &&
        hasValue('PAYPAL_WEBHOOK_ID') &&
        hasValue('PAYPAL_RETURN_URL') &&
        hasValue('PAYPAL_CANCEL_URL') &&
        !String(process.env.PAYPAL_RETURN_URL).includes('example.com') &&
        !String(process.env.PAYPAL_CANCEL_URL).includes('example.com');

      dependencies.paypalConfig = {
        status: paypalReady ? 'up' : 'down',
        detail: paypalReady
          ? 'PayPal checkout and webhook configuration ready.'
          : 'Missing or invalid PAYPAL_* configuration for checkout/webhook.'
      };
    }

    try {
      await readRuntimeState();
      dependencies.runtimePersistence = {
        status: 'up',
        detail: 'Runtime state is readable/writable.'
      };
    } catch (error) {
      dependencies.runtimePersistence = {
        status: 'down',
        detail: error instanceof Error ? error.message : 'Failed to access runtime persistence.'
      };
    }

    const hasPostgres = await isPostgresAvailable();
    if (hasPostgres) {
      const postgresProbe = await checkPostgresConnection();
      dependencies.postgres = {
        status: postgresProbe.ok ? 'up' : 'down',
        detail: postgresProbe.detail
      };
    }

    if (shouldRunActiveProbes() && isProduction()) {
      if (hasValue('PAYMENT_GATEWAY_CONFIRM_URL')) {
        const paymentProbe = await probeUrl(String(process.env.PAYMENT_GATEWAY_CONFIRM_URL));
        dependencies.paymentGateway = {
          status: paymentProbe.ok ? 'up' : 'down',
          detail: paymentProbe.detail
        };
      }

      if (hasValue('ENTITLEMENT_API_URL')) {
        const entitlementProbe = await probeUrl(String(process.env.ENTITLEMENT_API_URL));
        dependencies.entitlementApi = {
          status: entitlementProbe.ok ? 'up' : 'down',
          detail: entitlementProbe.detail
        };
      }

      if (hasValue('CONTENT_PUBLISHER_API_URL')) {
        const contentProbe = await probeUrl(String(process.env.CONTENT_PUBLISHER_API_URL));
        dependencies.contentPublisherApi = {
          status: contentProbe.ok ? 'up' : 'down',
          detail: contentProbe.detail
        };
      }
    }

    const hasDownDependency = Object.values(dependencies).some((dependency) => dependency.status === 'down');

    return {
      status: hasDownDependency ? 'degraded' : 'ok',
      service: 'copilot-server-mode',
      time: new Date().toISOString(),
      dependencies
    };
  }
}
