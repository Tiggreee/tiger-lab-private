import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

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

export interface RuntimeState {
  readonly leads: Record<string, RuntimeLeadState>;
  readonly leadScores: Record<string, RuntimeLeadScoreState>;
  readonly payments: Record<string, RuntimePaymentState>;
  readonly accounts: Record<string, RuntimeProvisionedAccountState>;
  readonly assets: Record<string, RuntimeContentAssetState>;
  readonly publications: Record<string, RuntimePublicationState>;
}

const DEFAULT_STATE: RuntimeState = {
  leads: {},
  leadScores: {},
  payments: {},
  accounts: {},
  assets: {},
  publications: {}
};

let saveQueue: Promise<void> = Promise.resolve();

function stateFilePath(): string {
  return path.resolve(process.env.RUNTIME_STATE_FILE || 'ops/runtime/runtime-state.json');
}

async function ensureStateFile(): Promise<string> {
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
      publications: parsed.publications || {}
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export async function updateRuntimeState(mutator: (state: RuntimeState) => RuntimeState): Promise<void> {
  saveQueue = saveQueue.then(async () => {
    const filePath = await ensureStateFile();
    const current = await readRuntimeState();
    const next = mutator(current);
    await writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  });

  await saveQueue;
}
