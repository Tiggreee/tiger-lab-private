import { readRuntimeState, updateRuntimeState } from '../../src/shared/infrastructure/persistence/runtime-state';
import { InvoiceMcpAuditor } from './invoice-mcp-auditor';

export interface InvoiceAutomationInput {
  readonly paymentId: string;
  readonly customerId: string;
  readonly productId: string;
  readonly planId: string;
  readonly amount: number;
  readonly currency: string;
  readonly buyerEmail?: string;
  readonly sellerEmail?: string;
  readonly accountantEmail?: string;
}

export interface InvoiceAutomationResult {
  readonly status: 'issued' | 'skipped' | 'failed';
  readonly detail: string;
  readonly cfdiUuid?: string;
  readonly recipients: readonly string[];
}

export interface InvoiceAutomationService {
  issueAndNotify(input: InvoiceAutomationInput): Promise<InvoiceAutomationResult>;
}

function resolveInvoiceProvider(): string {
  return (process.env.INVOICE_PROVIDER || 'facturama').trim().toLowerCase();
}

function hasFacturamaConfig(): boolean {
  return Boolean(process.env.FACTURAMA_API_KEY && process.env.FACTURAMA_API_SECRET);
}

function normalizeEmail(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (!normalized.includes('@') || normalized.startsWith('@') || normalized.endsWith('@')) {
    return null;
  }

  return normalized;
}

function collectRecipients(input: InvoiceAutomationInput): string[] {
  const configured = [
    input.buyerEmail,
    input.sellerEmail || process.env.BILLING_SELLER_EMAIL,
    input.accountantEmail || process.env.BILLING_ACCOUNTANT_EMAIL
  ];

  return Array.from(
    new Set(
      configured
        .map((item) => normalizeEmail(item))
        .filter((item): item is string => !!item)
    )
  );
}

async function issueCfdiWithFacturama(input: InvoiceAutomationInput): Promise<{ uuid: string; xml: string; pdf?: string }> {
  const apiKey = process.env.FACTURAMA_API_KEY;
  const apiSecret = process.env.FACTURAMA_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error('Missing FACTURAMA_API_KEY or FACTURAMA_API_SECRET.');
  }

  const baseUrl = (process.env.FACTURAMA_API_BASE_URL || 'https://apisandbox.facturama.mx').replace(/\/$/, '');
  const issueUrl = process.env.FACTURAMA_ISSUE_CFDI_URL || `${baseUrl}/api-lite/3/cfdis`;

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const response = await fetch(issueUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ExternalReference: input.paymentId,
      CustomerReference: input.customerId,
      ProductReference: input.productId,
      PlanReference: input.planId,
      Currency: input.currency,
      Amount: input.amount
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Facturama issue failed: ${response.status} ${errorBody}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const uuid = String(payload.uuid || payload.UUID || payload.Id || '').trim();
  const xml = String(payload.xml || payload.Xml || payload.cfdi || '').trim();
  const pdf = String(payload.pdf || payload.Pdf || '').trim();

  if (!uuid || !xml) {
    throw new Error('Facturama response missing UUID/XML fields.');
  }

  return {
    uuid,
    xml,
    pdf: pdf || undefined
  };
}

async function sendInvoiceEmailWithResend(recipients: readonly string[], uuid: string, xml: string, pdf?: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.BILLING_FROM_EMAIL;

  if (!resendApiKey || !fromEmail) {
    throw new Error('Missing RESEND_API_KEY or BILLING_FROM_EMAIL.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromEmail,
      to: recipients,
      subject: `Factura emitida ${uuid}`,
      html: `<p>Tu factura fue emitida con UUID <strong>${uuid}</strong>.</p>`,
      attachments: [
        {
          filename: `cfdi-${uuid}.xml`,
          content: Buffer.from(xml, 'utf8').toString('base64')
        },
        ...(pdf
          ? [
              {
                filename: `cfdi-${uuid}.pdf`,
                content: pdf
              }
            ]
          : [])
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend delivery failed: ${response.status} ${errorBody}`);
  }
}

function strictInvoiceAutomationEnabled(): boolean {
  return process.env.INVOICE_AUTOMATION_STRICT === 'true';
}

async function persistInvoiceEvidence(
  input: InvoiceAutomationInput,
  result: InvoiceAutomationResult,
  xmlReference?: string,
  pdfReference?: string
): Promise<void> {
  const issuedAt = new Date().toISOString();
  await updateRuntimeState((state) => ({
    ...state,
    invoices: {
      ...state.invoices,
      [input.paymentId]: {
        paymentId: input.paymentId,
        customerId: input.customerId,
        productId: input.productId,
        planId: input.planId,
        amount: input.amount,
        currency: input.currency,
        status: result.status,
        detail: result.detail,
        cfdiUuid: result.cfdiUuid,
        xmlReference,
        pdfReference,
        recipients: result.recipients,
        issuedAt
      }
    }
  }));
}

export class FacturamaResendInvoiceAutomationService implements InvoiceAutomationService {
  private readonly mcpAuditor = new InvoiceMcpAuditor();

  public async issueAndNotify(input: InvoiceAutomationInput): Promise<InvoiceAutomationResult> {
    const provider = resolveInvoiceProvider();
    if (provider !== 'facturama') {
      const skippedResult: InvoiceAutomationResult = {
        status: 'skipped',
        detail: `Invoice provider '${provider}' is not active. Pending manual/retry issuance.`,
        recipients: []
      };
      await this.mcpAuditor.recordControlEvent({
        input,
        provider,
        status: 'blocked',
        decision: 'manual-review',
        detail: skippedResult.detail
      });
      await persistInvoiceEvidence(input, skippedResult);
      return skippedResult;
    }

    if (!hasFacturamaConfig()) {
      const skippedResult: InvoiceAutomationResult = {
        status: 'skipped',
        detail: 'Facturama credentials are missing. Pending manual/retry issuance.',
        recipients: []
      };
      await this.mcpAuditor.recordControlEvent({
        input,
        provider,
        status: 'failed',
        decision: strictInvoiceAutomationEnabled() ? 'block' : 'manual-review',
        detail: skippedResult.detail
      });
      await persistInvoiceEvidence(input, skippedResult);
      return skippedResult;
    }

    const currentState = await readRuntimeState();
    const existingInvoice = currentState.invoices[input.paymentId];
    if (existingInvoice?.cfdiUuid) {
      return {
        status: 'skipped',
        detail: `Invoice already issued for payment ${input.paymentId} (UUID ${existingInvoice.cfdiUuid}).`,
        cfdiUuid: existingInvoice.cfdiUuid,
        recipients: existingInvoice.recipients || []
      };
    }

    const recipients = collectRecipients(input);
    if (recipients.length === 0) {
      const skippedResult: InvoiceAutomationResult = {
        status: 'skipped',
        detail: 'No valid recipients configured for invoice delivery.',
        recipients
      };
      await this.mcpAuditor.recordControlEvent({
        input,
        provider,
        status: 'failed',
        decision: 'manual-review',
        detail: skippedResult.detail
      });
      await persistInvoiceEvidence(input, skippedResult);
      return skippedResult;
    }

    try {
      const { cfdi } = await this.mcpAuditor.executeTimbrado(input, provider, () => issueCfdiWithFacturama(input));
      if (!cfdi) {
        throw new Error('MCP auditor completed without CFDI payload.');
      }

      await sendInvoiceEmailWithResend(recipients, cfdi.uuid, cfdi.xml, cfdi.pdf);
      const issuedResult: InvoiceAutomationResult = {
        status: 'issued',
        detail: 'CFDI issued and delivered via email.',
        cfdiUuid: cfdi.uuid,
        recipients
      };
      await persistInvoiceEvidence(input, issuedResult, `facturama:xml:${cfdi.uuid}`, cfdi.pdf ? `facturama:pdf:${cfdi.uuid}` : undefined);
      return issuedResult;
    } catch (error) {
      const failedResult: InvoiceAutomationResult = {
        status: 'failed',
        detail: error instanceof Error ? error.message : 'Invoice automation failed.',
        recipients
      };
      await persistInvoiceEvidence(input, failedResult);
      if (strictInvoiceAutomationEnabled()) {
        throw new Error(failedResult.detail);
      }
      return failedResult;
    }
  }
}
