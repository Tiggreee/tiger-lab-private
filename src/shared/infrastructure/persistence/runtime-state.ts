import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readRuntimeStateFromPostgres, writeRuntimeStateToPostgres } from './postgres-runtime-store';

export interface RuntimeLeadState {
  readonly leadId: string;
  readonly source: string;
  readonly createdAt: string;
  readonly score?: number;
}

export interface RuntimeLeadScoreState {
  readonly leadId: string;
  readonly value: number;
  readonly scoredAt: string;
}

export interface RuntimePaymentState {
  readonly paymentId: string;
  readonly customerId: string;
  readonly productId: string;
  readonly planId: string;
  readonly amount: number;
  readonly currency: string;
  readonly createdAt: string;
  readonly status: 'pending' | 'succeeded';
}

export interface RuntimeProvisionedAccountState {
  readonly accountId: string;
  readonly customerId: string;
  readonly productId: string;
  readonly planId: string;
  readonly provisionedAt: string;
}

export interface RuntimeContentAssetState {
  readonly assetId: string;
  readonly productId: string;
  readonly body: string;
  readonly generatedAt: string;
}

export interface RuntimePublicationState {
  readonly publicationId: string;
  readonly assetId: string;
  readonly channel: string;
  readonly publishedAt: string;
}

export interface RuntimeInvoiceState {
  readonly paymentId: string;
  readonly customerId: string;
  readonly productId: string;
  readonly planId: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: 'issued' | 'skipped' | 'failed';
  readonly detail: string;
  readonly cfdiUuid?: string;
  readonly xmlReference?: string;
  readonly pdfReference?: string;
  readonly recipients: readonly string[];
  readonly issuedAt: string;
}

export interface RuntimeInvoiceMcpAuditState {
  readonly auditId: string;
  readonly paymentId: string;
  readonly provider: string;
  readonly action: 'issue_cfdi';
  readonly status: 'success' | 'failed' | 'blocked';
  readonly decision: 'apply' | 'manual-review' | 'block';
  readonly detail: string;
  readonly benchmark: {
    readonly latencyMs: number;
    readonly latencyTargetMs: number;
    readonly withinLatencyTarget: boolean;
    readonly recentFailureRate: number;
    readonly failureRateThreshold: number;
    readonly withinFailureRateTarget: boolean;
    readonly sampleSize: number;
  };
  readonly recommendations: readonly string[];
  readonly startedAt: string;
  readonly finishedAt: string;
}

export interface RuntimeLinkedInOAuthPendingState {
  readonly state: string;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface RuntimeLinkedInOAuthState {
  readonly accessToken?: string;
  readonly tokenType?: string;
  readonly expiresAt?: string;
  readonly refreshToken?: string;
  readonly orgId?: string;
  readonly adAccountId?: string;
  readonly connectedAt?: string;
  readonly updatedAt?: string;
  readonly pendingState?: RuntimeLinkedInOAuthPendingState;
}

export interface RuntimeState {
  readonly leads: Record<string, RuntimeLeadState>;
  readonly leadScores: Record<string, RuntimeLeadScoreState>;
  readonly payments: Record<string, RuntimePaymentState>;
  readonly accounts: Record<string, RuntimeProvisionedAccountState>;
  readonly assets: Record<string, RuntimeContentAssetState>;
  readonly publications: Record<string, RuntimePublicationState>;
  readonly invoices: Record<string, RuntimeInvoiceState>;
  readonly invoiceMcpAudits: Record<string, RuntimeInvoiceMcpAuditState>;
  readonly linkedinOAuth: RuntimeLinkedInOAuthState;
}

const DEFAULT_STATE: RuntimeState = {
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

const IS_TEST_RUNTIME = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
let inMemoryState: RuntimeState = DEFAULT_STATE;
let saveQueue: Promise<void> = Promise.resolve();

function isPostgresRuntimeEnabled(): boolean {
  const backend = (process.env.RUNTIME_STATE_BACKEND || '').trim().toLowerCase();
  if (backend === 'file') {
    return false;
  }
  if (backend === 'postgres') {
    return true;
  }
  return typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.trim().length > 0;
}

function stateFilePath(): string {
  return path.resolve(process.env.RUNTIME_STATE_FILE || 'ops/runtime/runtime-state.json');
}

async function ensureStateFile(): Promise<string> {
  if (IS_TEST_RUNTIME && !process.env.RUNTIME_STATE_FILE) {
    return Promise.resolve('');
  }

  const filePath = stateFilePath();
  const dirPath = path.dirname(filePath);
  await mkdir(dirPath, { recursive: true });

  try {
    await readFile(filePath, 'utf8');
  } catch {
    await writeFile(filePath, `${JSON.stringify(DEFAULT_STATE, null, 2)}\n`, 'utf8');
  }

  return filePath;
}

export async function readRuntimeState(): Promise<RuntimeState> {
  if (IS_TEST_RUNTIME && !process.env.RUNTIME_STATE_FILE) {
    return inMemoryState;
  }

  if (isPostgresRuntimeEnabled()) {
    try {
      const fromPostgres = await readRuntimeStateFromPostgres();
      if (fromPostgres) {
        return {
          leads: fromPostgres.leads || {},
          leadScores: fromPostgres.leadScores || {},
          payments: fromPostgres.payments || {},
          accounts: fromPostgres.accounts || {},
          assets: fromPostgres.assets || {},
          publications: fromPostgres.publications || {},
          invoices: (fromPostgres as Partial<RuntimeState>).invoices || {},
          invoiceMcpAudits: (fromPostgres as Partial<RuntimeState>).invoiceMcpAudits || {},
          linkedinOAuth: (fromPostgres as Partial<RuntimeState>).linkedinOAuth || {}
        };
      }
    } catch {
      // Fallback to file persistence if Postgres is temporarily unavailable.
    }
  }

  const filePath = await ensureStateFile();
  const raw = await readFile(filePath, 'utf8');

  try {
    const parsed = JSON.parse(raw) as Partial<RuntimeState>;
    return {
      leads: parsed.leads || {},
      leadScores: parsed.leadScores || {},
      payments: parsed.payments || {},
      accounts: parsed.accounts || {},
      assets: parsed.assets || {},
      publications: parsed.publications || {},
      invoices: parsed.invoices || {},
      invoiceMcpAudits: parsed.invoiceMcpAudits || {},
      linkedinOAuth: parsed.linkedinOAuth || {}
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export async function updateRuntimeState(mutator: (state: RuntimeState) => RuntimeState): Promise<void> {
  if (IS_TEST_RUNTIME && !process.env.RUNTIME_STATE_FILE) {
    inMemoryState = mutator(inMemoryState);
    return;
  }

  if (isPostgresRuntimeEnabled()) {
    saveQueue = saveQueue.then(async () => {
      const current = await readRuntimeState();
      const next = mutator(current);
      try {
        await writeRuntimeStateToPostgres(next);
      } catch {
        // Keep file update path as fallback durability.
      }

      const filePath = await ensureStateFile();
      await writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    });

    await saveQueue;
    return;
  }

  saveQueue = saveQueue.then(async () => {
    const filePath = await ensureStateFile();
    const current = await readRuntimeState();
    const next = mutator(current);
    await writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  });

  await saveQueue;
}
