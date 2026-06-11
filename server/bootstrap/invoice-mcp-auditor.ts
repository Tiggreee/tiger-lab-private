import { readRuntimeState, updateRuntimeState, type RuntimeInvoiceMcpAuditState } from '../../src/shared/infrastructure/persistence/runtime-state';
import type { InvoiceAutomationInput } from './invoice-automation-service';

export interface InvoiceMcpBenchmarkConfig {
  readonly latencyTargetMs: number;
  readonly failureRateThreshold: number;
  readonly sampleSize: number;
}

export interface InvoiceMcpAuditorConfig {
  readonly benchmark: InvoiceMcpBenchmarkConfig;
  readonly strictMode: boolean;
  readonly now?: () => Date;
  readonly idGenerator?: () => string;
}

interface CorrectionPattern {
  readonly matcher: RegExp;
  readonly recommendation: string;
}

const CORRECTION_PATTERNS: readonly CorrectionPattern[] = [
  {
    matcher: /missing\s+facturama_api_key|missing\s+facturama_api_secret/i,
    recommendation: 'Configura FACTURAMA_API_KEY y FACTURAMA_API_SECRET con rotacion de credenciales.'
  },
  {
    matcher: /missing\s+resend_api_key|missing\s+billing_from_email/i,
    recommendation: 'Configura RESEND_API_KEY y BILLING_FROM_EMAIL para entrega automatizada de factura.'
  },
  {
    matcher: /tim(e)?out|abort/i,
    recommendation: 'Aumenta timeout o aplica retry con backoff para el proveedor externo.'
  },
  {
    matcher: /401|403|unauthorized|forbidden/i,
    recommendation: 'Verifica permisos/scopes del proveedor PAC y validez de API keys.'
  },
  {
    matcher: /5\d\d|service unavailable|bad gateway|gateway timeout/i,
    recommendation: 'Marca incidente de proveedor y activa fallback manual controlado.'
  }
];

function defaultNow(): Date {
  return new Date();
}

function defaultAuditId(): string {
  return `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveRecommendations(detail: string, isSuccessful: boolean): string[] {
  if (isSuccessful) {
    return ['Mantener monitoreo continuo y comparar tendencia de latencia/fallos por proveedor.'];
  }

  const normalized = detail.trim();
  const matched = CORRECTION_PATTERNS.filter((pattern) => pattern.matcher.test(normalized)).map(
    (pattern) => pattern.recommendation
  );

  if (matched.length > 0) {
    return Array.from(new Set(matched));
  }

  return ['Enviar a revision manual con evidencia completa para definir correccion de bajo riesgo.'];
}

async function computeRecentFailureRate(provider: string, sampleSize: number): Promise<{ failureRate: number; total: number }> {
  const state = await readRuntimeState();
  const audits = Object.values(state.invoiceMcpAudits)
    .filter((audit) => audit.provider === provider)
    .sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))
    .slice(0, sampleSize);

  if (audits.length === 0) {
    return { failureRate: 0, total: 0 };
  }

  const failedCount = audits.filter((audit) => audit.status === 'failed' || audit.status === 'blocked').length;
  return { failureRate: failedCount / audits.length, total: audits.length };
}

function resolveDecision(params: {
  strictMode: boolean;
  isSuccessful: boolean;
  withinLatencyTarget: boolean;
  withinFailureRateTarget: boolean;
}): RuntimeInvoiceMcpAuditState['decision'] {
  if (!params.isSuccessful) {
    return params.strictMode ? 'block' : 'manual-review';
  }

  if (!params.withinLatencyTarget || !params.withinFailureRateTarget) {
    return 'manual-review';
  }

  return 'apply';
}

async function persistAudit(audit: RuntimeInvoiceMcpAuditState): Promise<void> {
  await updateRuntimeState((state) => ({
    ...state,
    invoiceMcpAudits: {
      ...state.invoiceMcpAudits,
      [audit.auditId]: audit
    }
  }));
}

export class InvoiceMcpAuditor {
  private readonly benchmark: InvoiceMcpBenchmarkConfig;
  private readonly strictMode: boolean;
  private readonly now: () => Date;
  private readonly idGenerator: () => string;

  constructor(config?: Partial<InvoiceMcpAuditorConfig>) {
    this.benchmark = {
      latencyTargetMs: clamp(Number(config?.benchmark?.latencyTargetMs ?? process.env.MCP_PAC_BENCHMARK_MAX_MS ?? 4000), 100, 120000),
      failureRateThreshold: clamp(Number(config?.benchmark?.failureRateThreshold ?? process.env.MCP_PAC_FAILURE_RATE_THRESHOLD ?? 0.2), 0, 1),
      sampleSize: clamp(Number(config?.benchmark?.sampleSize ?? process.env.MCP_PAC_BENCHMARK_SAMPLE_SIZE ?? 50), 5, 500)
    };
    this.strictMode = config?.strictMode ?? process.env.INVOICE_AUTOMATION_STRICT === 'true';
    this.now = config?.now ?? defaultNow;
    this.idGenerator = config?.idGenerator ?? defaultAuditId;
  }

  public async executeTimbrado(
    input: InvoiceAutomationInput,
    provider: string,
    action: () => Promise<{ uuid: string; xml: string; pdf?: string }>
  ): Promise<{ cfdi?: { uuid: string; xml: string; pdf?: string }; audit: RuntimeInvoiceMcpAuditState }> {
    const startedAt = this.now();

    try {
      const cfdi = await action();
      const finishedAt = this.now();
      const latencyMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());
      const recent = await computeRecentFailureRate(provider, this.benchmark.sampleSize);
      const withinLatencyTarget = latencyMs <= this.benchmark.latencyTargetMs;
      const withinFailureRateTarget = recent.failureRate <= this.benchmark.failureRateThreshold;

      const audit: RuntimeInvoiceMcpAuditState = {
        auditId: this.idGenerator(),
        paymentId: input.paymentId,
        provider,
        action: 'issue_cfdi',
        status: 'success',
        decision: resolveDecision({
          strictMode: this.strictMode,
          isSuccessful: true,
          withinLatencyTarget,
          withinFailureRateTarget
        }),
        detail: 'MCP PAC execution completed successfully.',
        benchmark: {
          latencyMs,
          latencyTargetMs: this.benchmark.latencyTargetMs,
          withinLatencyTarget,
          recentFailureRate: recent.failureRate,
          failureRateThreshold: this.benchmark.failureRateThreshold,
          withinFailureRateTarget,
          sampleSize: recent.total
        },
        recommendations: resolveRecommendations('success', true),
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString()
      };

      await persistAudit(audit);
      return { cfdi, audit };
    } catch (error) {
      const finishedAt = this.now();
      const latencyMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());
      const detail = error instanceof Error ? error.message : 'Unknown MCP PAC error.';
      const recent = await computeRecentFailureRate(provider, this.benchmark.sampleSize);
      const withinLatencyTarget = latencyMs <= this.benchmark.latencyTargetMs;
      const withinFailureRateTarget = recent.failureRate <= this.benchmark.failureRateThreshold;

      const decision = resolveDecision({
        strictMode: this.strictMode,
        isSuccessful: false,
        withinLatencyTarget,
        withinFailureRateTarget
      });

      const audit: RuntimeInvoiceMcpAuditState = {
        auditId: this.idGenerator(),
        paymentId: input.paymentId,
        provider,
        action: 'issue_cfdi',
        status: decision === 'block' ? 'blocked' : 'failed',
        decision,
        detail,
        benchmark: {
          latencyMs,
          latencyTargetMs: this.benchmark.latencyTargetMs,
          withinLatencyTarget,
          recentFailureRate: recent.failureRate,
          failureRateThreshold: this.benchmark.failureRateThreshold,
          withinFailureRateTarget,
          sampleSize: recent.total
        },
        recommendations: resolveRecommendations(detail, false),
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString()
      };

      await persistAudit(audit);
      throw Object.assign(new Error(detail), { audit });
    }
  }

  public async recordControlEvent(params: {
    input: InvoiceAutomationInput;
    provider: string;
    status: RuntimeInvoiceMcpAuditState['status'];
    decision: RuntimeInvoiceMcpAuditState['decision'];
    detail: string;
  }): Promise<RuntimeInvoiceMcpAuditState> {
    const now = this.now();
    const recent = await computeRecentFailureRate(params.provider, this.benchmark.sampleSize);
    const benchmark: RuntimeInvoiceMcpAuditState['benchmark'] = {
      latencyMs: 0,
      latencyTargetMs: this.benchmark.latencyTargetMs,
      withinLatencyTarget: true,
      recentFailureRate: recent.failureRate,
      failureRateThreshold: this.benchmark.failureRateThreshold,
      withinFailureRateTarget: recent.failureRate <= this.benchmark.failureRateThreshold,
      sampleSize: recent.total
    };

    const audit: RuntimeInvoiceMcpAuditState = {
      auditId: this.idGenerator(),
      paymentId: params.input.paymentId,
      provider: params.provider,
      action: 'issue_cfdi',
      status: params.status,
      decision: params.decision,
      detail: params.detail,
      benchmark,
      recommendations: resolveRecommendations(params.detail, false),
      startedAt: now.toISOString(),
      finishedAt: now.toISOString()
    };

    await persistAudit(audit);
    return audit;
  }
}
