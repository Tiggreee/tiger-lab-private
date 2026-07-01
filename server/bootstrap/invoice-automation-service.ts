import { readRuntimeState, updateRuntimeState } from '../../src/shared/infrastructure/persistence/runtime-state';
import { InvoiceMcpAuditor } from './invoice-mcp-auditor';
import { readFileSync } from 'node:fs';

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
  return (process.env.INVOICE_PROVIDER || 'timbox').trim().toLowerCase();
}

function hasFacturamaConfig(): boolean {
  return Boolean(process.env.FACTURAMA_API_KEY && process.env.FACTURAMA_API_SECRET);
}

function hasTimboxConfig(): boolean {
  return Boolean(
    process.env.TIMBOX_ADAPTER_URL &&
      process.env.TIMBOX_USERNAME &&
      process.env.TIMBOX_PASSWORD &&
      resolveTimboxSxmlBase64()
  );
}

function resolveTimboxSxmlBase64(): string | null {
  const inlineBase64 = process.env.TIMBOX_SXML_BASE64?.trim();
  if (inlineBase64) {
    return inlineBase64;
  }

  const xmlPath = process.env.TIMBOX_SXML_PATH?.trim();
  if (!xmlPath) {
    return null;
  }

  try {
    const xmlContent = readFileSync(xmlPath, 'utf8');
    if (!xmlContent.trim()) {
      return null;
    }
    return Buffer.from(xmlContent, 'utf8').toString('base64');
  } catch {
    return null;
  }
}

function timboxPreflightStrictEnabled(): boolean {
  const value = process.env.TIMBOX_TIMBRADO_PREFLIGHT_STRICT;
  if (typeof value !== 'string') {
    return true;
  }
  return value.trim().toLowerCase() !== 'false';
}

function extractXmlAttribute(xml: string, attributeName: string): string {
  const escaped = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`\\b${escaped}="([^"]*)"`);
  const match = xml.match(matcher);
  return match?.[1]?.trim() || '';
}

function validateTimboxSxmlPayload(sxml: string): void {
  const errors: string[] = [];

  let xml = '';
  try {
    xml = Buffer.from(sxml, 'base64').toString('utf8');
  } catch {
    errors.push('SXML is not valid base64.');
  }

  if (!xml || !xml.includes('<cfdi:Comprobante')) {
    errors.push('SXML decoded payload does not contain cfdi:Comprobante root.');
  }

  const noCertificado = extractXmlAttribute(xml, 'NoCertificado');
  const certificado = extractXmlAttribute(xml, 'Certificado');
  const sello = extractXmlAttribute(xml, 'Sello');
  const fecha = extractXmlAttribute(xml, 'Fecha');

  if (!noCertificado) {
    errors.push('cfdi:Comprobante NoCertificado is required.');
  } else if (!/^[0-9]{20}$/.test(noCertificado)) {
    if (noCertificado.length > 100) {
      errors.push('NoCertificado appears to contain the full certificate content. It must be only the 20-digit certificate number.');
    } else {
      errors.push(`NoCertificado must match [0-9]{20}. Received '${noCertificado}'.`);
    }
  }

  if (!certificado) {
    errors.push('cfdi:Comprobante Certificado is required.');
  } else if (!/^[A-Za-z0-9+/=]+$/.test(certificado)) {
    errors.push('Certificado must be base64 DER content without PEM headers.');
  } else if (certificado.length < 300) {
    errors.push('Certificado length is suspiciously short. Expected base64 DER certificate content, not serial/placeholder.');
  }

  if (!sello) {
    errors.push('cfdi:Comprobante Sello is required.');
  } else if (!/^[A-Za-z0-9+/=]+$/.test(sello)) {
    errors.push('Sello must be valid base64.');
  }

  if (fecha) {
    const issuedAt = new Date(fecha);
    if (!Number.isNaN(issuedAt.getTime()) && issuedAt.getTime() > Date.now() + 2 * 60 * 1000) {
      errors.push('Fecha in cfdi:Comprobante is in the future (timezone mismatch risk).');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Timbox CFDI preflight failed: ${errors.join(' | ')}`);
  }
}

function timboxManifestRequired(): boolean {
  return process.env.TIMBOX_MANIFIESTO_REQUIRED === 'true';
}

function resolveTimboxManifestMethod(): 'firmar_manifiesto' | 'firmar_manifiesto_sello' {
  return process.env.TIMBOX_MANIFIESTO_METHOD === 'firmar_manifiesto_sello'
    ? 'firmar_manifiesto_sello'
    : 'firmar_manifiesto';
}

function resolveTimboxManifestAdapterUrl(): string | null {
  const configured = process.env.TIMBOX_ADAPTER_MANIFIESTO_URL?.trim();
  if (configured) {
    return configured;
  }

  const adapterUrl = process.env.TIMBOX_ADAPTER_URL?.trim();
  if (!adapterUrl) {
    return null;
  }

  if (adapterUrl.endsWith('/timbox/timbrar')) {
    return adapterUrl.replace(/\/timbox\/timbrar$/, '/timbox/manifiesto/firmar');
  }

  return `${adapterUrl.replace(/\/$/, '')}/timbox/manifiesto/firmar`;
}

function resolveTimboxManifestCertificado(): string | null {
  const inline = process.env.TIMBOX_MANIFIESTO_CERTIFICADO_PEM?.trim();
  if (inline) {
    return inline;
  }

  const certPath = process.env.TIMBOX_MANIFIESTO_CERTIFICADO_PATH?.trim();
  if (!certPath) {
    return null;
  }

  try {
    const certContent = readFileSync(certPath, 'utf8').trim();
    return certContent || null;
  } catch {
    return null;
  }
}

function resolveTimboxManifestLlave(): string | null {
  const inline = process.env.TIMBOX_MANIFIESTO_LLAVE_PEM?.trim();
  if (inline) {
    return inline;
  }

  const keyPath = process.env.TIMBOX_MANIFIESTO_LLAVE_PATH?.trim();
  if (!keyPath) {
    return null;
  }

  try {
    const keyContent = readFileSync(keyPath, 'utf8').trim();
    return keyContent || null;
  } catch {
    return null;
  }
}

async function signTimboxManifestIfRequired(input: InvoiceAutomationInput): Promise<void> {
  if (!timboxManifestRequired()) {
    return;
  }

  const adapterUrl = resolveTimboxManifestAdapterUrl();
  const username = process.env.TIMBOX_USERNAME?.trim() || '';
  const password = process.env.TIMBOX_PASSWORD?.trim() || '';
  const email = process.env.TIMBOX_MANIFIESTO_EMAIL?.trim() || '';
  const method = resolveTimboxManifestMethod();
  const rfc = process.env.TIMBOX_MANIFIESTO_RFC?.trim() || '';
  const razonSocial = process.env.TIMBOX_MANIFIESTO_RAZON_SOCIAL?.trim() || '';
  const llavePem = resolveTimboxManifestLlave() || '';
  const cadena = process.env.TIMBOX_MANIFIESTO_CADENA?.trim() || '';
  const sello = process.env.TIMBOX_MANIFIESTO_SELLO?.trim() || '';
  const certificado = resolveTimboxManifestCertificado() || '';
  const manifiestoWsdl = process.env.TIMBOX_MANIFIESTO_WSDL?.trim();

  const missing: string[] = [];
  if (!adapterUrl) missing.push('TIMBOX_ADAPTER_MANIFIESTO_URL|TIMBOX_ADAPTER_URL');
  if (!username) missing.push('TIMBOX_USERNAME');
  if (!password) missing.push('TIMBOX_PASSWORD');
  if (!email) missing.push('TIMBOX_MANIFIESTO_EMAIL');
  if (method === 'firmar_manifiesto') {
    if (!rfc) missing.push('TIMBOX_MANIFIESTO_RFC');
    if (!razonSocial) missing.push('TIMBOX_MANIFIESTO_RAZON_SOCIAL');
    if (!certificado) missing.push('TIMBOX_MANIFIESTO_CERTIFICADO_PEM|TIMBOX_MANIFIESTO_CERTIFICADO_PATH');
    if (!llavePem) missing.push('TIMBOX_MANIFIESTO_LLAVE_PEM|TIMBOX_MANIFIESTO_LLAVE_PATH');
  } else {
    if (!cadena) missing.push('TIMBOX_MANIFIESTO_CADENA');
    if (!sello) missing.push('TIMBOX_MANIFIESTO_SELLO');
    if (!certificado) missing.push('TIMBOX_MANIFIESTO_CERTIFICADO_PEM|TIMBOX_MANIFIESTO_CERTIFICADO_PATH');
  }

  if (missing.length > 0) {
    throw new Error(`Timbox manifiesto signing required but missing: ${missing.join(', ')}`);
  }

  const timeoutMs = Number(process.env.TIMBOX_TIMEOUT_MS || '30000');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(adapterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        password,
        manifiestoMethod: method,
        email,
        ...(method === 'firmar_manifiesto'
          ? {
              rfc,
              razon_social: razonSocial,
              cert_pem: certificado,
              llave_pem: llavePem
            }
          : {
              cadena,
              sello,
              certificado
            }),
        manifiestoWsdl,
        invoice: {
          paymentId: input.paymentId,
          customerId: input.customerId,
          productId: input.productId,
          planId: input.planId,
          amount: input.amount,
          currency: input.currency
        }
      }),
      signal: controller.signal
    });

    const responseBody = await response.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(responseBody) as Record<string, unknown>;
    } catch {
      payload = {};
    }

    if (!response.ok) {
      throw new Error(`Timbox manifiesto sign failed: ${response.status} ${responseBody}`);
    }

    const code = String(payload.code || '').trim();
    const message = String(payload.message || '').trim();
    if (code && code !== '200') {
      throw new Error(`Timbox manifiesto rejected (${code}): ${message || 'no message'}`);
    }
  } finally {
    clearTimeout(timeout);
  }
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

async function issueCfdiWithTimbox(input: InvoiceAutomationInput): Promise<{ uuid: string; xml: string; pdf?: string }> {
  const adapterUrl = process.env.TIMBOX_ADAPTER_URL;
  const username = process.env.TIMBOX_USERNAME;
  const password = process.env.TIMBOX_PASSWORD;
  const sxml = resolveTimboxSxmlBase64();
  if (!adapterUrl || !username || !password || !sxml) {
    throw new Error('Missing TIMBOX_ADAPTER_URL, TIMBOX_USERNAME, TIMBOX_PASSWORD or TIMBOX_SXML_BASE64/TIMBOX_SXML_PATH.');
  }

  if (timboxPreflightStrictEnabled()) {
    validateTimboxSxmlPayload(sxml);
  }

  const timeoutMs = Number(process.env.TIMBOX_TIMEOUT_MS || '30000');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await signTimboxManifestIfRequired(input);

    const response = await fetch(adapterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        password,
        timbradoWsdl: process.env.TIMBOX_TIMBRADO_WSDL,
        sxml,
        invoice: {
          paymentId: input.paymentId,
          customerId: input.customerId,
          productId: input.productId,
          planId: input.planId,
          amount: input.amount,
          currency: input.currency
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Timbox adapter issue failed: ${response.status} ${errorBody}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const uuid = String(payload.uuid || payload.UUID || payload.folioFiscal || '').trim();
    const xml = String(payload.xml || payload.Xml || payload.cfdi || '').trim();
    const pdf = String(payload.pdf || payload.Pdf || '').trim();

    if (!uuid || !xml) {
      throw new Error('Timbox adapter response missing UUID/XML fields.');
    }

    return {
      uuid,
      xml,
      pdf: pdf || undefined
    };
  } finally {
    clearTimeout(timeout);
  }
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
    if (provider !== 'facturama' && provider !== 'timbox') {
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

    if (provider === 'facturama' && !hasFacturamaConfig()) {
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

    if (provider === 'timbox' && !hasTimboxConfig()) {
      const skippedResult: InvoiceAutomationResult = {
        status: 'skipped',
        detail: 'Timbox credentials, adapter, or CFDI XML (SXML) are missing. Pending manual/retry issuance.',
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
      const issueCfdi = provider === 'timbox' ? issueCfdiWithTimbox : issueCfdiWithFacturama;
      const { cfdi } = await this.mcpAuditor.executeTimbrado(input, provider, () => issueCfdi(input));
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
      await persistInvoiceEvidence(
        input,
        issuedResult,
        `${provider}:xml:${cfdi.uuid}`,
        cfdi.pdf ? `${provider}:pdf:${cfdi.uuid}` : undefined
      );
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
