import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeState = {
  leads: {},
  leadScores: {},
  payments: {},
  accounts: {},
  assets: {},
  publications: {},
  invoices: {},
  invoiceMcpAudits: {}
};

vi.mock('../../../src/shared/infrastructure/persistence/runtime-state', () => ({
  readRuntimeState: vi.fn(async () => runtimeState),
  updateRuntimeState: vi.fn(async (mutator: (state: typeof runtimeState) => typeof runtimeState) => {
    const next = mutator(runtimeState);
    Object.assign(runtimeState, next);
  })
}));

import { InvoiceMcpAuditor } from '../../../server/bootstrap/invoice-mcp-auditor';

describe('InvoiceMcpAuditor', () => {
  beforeEach(() => {
    runtimeState.invoiceMcpAudits = {};
  });

  it('records successful execution with benchmark metadata', async () => {
    const auditor = new InvoiceMcpAuditor({
      strictMode: false,
      benchmark: {
        latencyTargetMs: 10_000,
        failureRateThreshold: 0.5,
        sampleSize: 20
      },
      idGenerator: () => 'audit-success-1',
      now: (() => {
        let tick = 0;
        return () => new Date(1_700_000_000_000 + tick++ * 100);
      })()
    });

    const output = await auditor.executeTimbrado(
      {
        paymentId: 'pay_1',
        customerId: 'cus_1',
        productId: 'prd_1',
        planId: 'plan_1',
        amount: 100,
        currency: 'MXN'
      },
      'facturama',
      async () => ({ uuid: 'uuid-1', xml: '<xml />' })
    );

    expect(output.cfdi?.uuid).toBe('uuid-1');
    expect(output.audit.status).toBe('success');
    expect(output.audit.decision).toBe('apply');
    expect(output.audit.benchmark.withinLatencyTarget).toBe(true);
    expect(runtimeState.invoiceMcpAudits['audit-success-1']).toBeDefined();
  });

  it('blocks failed execution when strict mode is enabled', async () => {
    const auditor = new InvoiceMcpAuditor({
      strictMode: true,
      benchmark: {
        latencyTargetMs: 10_000,
        failureRateThreshold: 0.2,
        sampleSize: 20
      },
      idGenerator: () => 'audit-failure-1'
    });

    await expect(
      auditor.executeTimbrado(
        {
          paymentId: 'pay_2',
          customerId: 'cus_2',
          productId: 'prd_2',
          planId: 'plan_2',
          amount: 500,
          currency: 'MXN'
        },
        'facturama',
        async () => {
          throw new Error('Missing FACTURAMA_API_KEY or FACTURAMA_API_SECRET.');
        }
      )
    ).rejects.toThrow('Missing FACTURAMA_API_KEY or FACTURAMA_API_SECRET.');

    expect(runtimeState.invoiceMcpAudits['audit-failure-1']).toBeDefined();
    expect(runtimeState.invoiceMcpAudits['audit-failure-1'].status).toBe('blocked');
    expect(runtimeState.invoiceMcpAudits['audit-failure-1'].decision).toBe('block');
    expect(runtimeState.invoiceMcpAudits['audit-failure-1'].recommendations.length).toBeGreaterThan(0);
  });
});
