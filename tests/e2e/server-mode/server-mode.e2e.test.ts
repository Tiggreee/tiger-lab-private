import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapApplication } from '../../../src/shared/infrastructure/bootstrap/app-bootstrap';

describe('E2E automation flow simulation', () => {
  const previousEnv = {
    PAYMENT_GATEWAY_CONFIRM_URL: process.env.PAYMENT_GATEWAY_CONFIRM_URL,
    ENTITLEMENT_API_URL: process.env.ENTITLEMENT_API_URL,
    CONTENT_PUBLISHER_API_URL: process.env.CONTENT_PUBLISHER_API_URL
  };

  beforeEach(() => {
    process.env.PAYMENT_GATEWAY_CONFIRM_URL = 'http://mock.local/payment';
    process.env.ENTITLEMENT_API_URL = 'http://mock.local/entitlement';
    process.env.CONTENT_PUBLISHER_API_URL = 'http://mock.local/content';

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.PAYMENT_GATEWAY_CONFIRM_URL = previousEnv.PAYMENT_GATEWAY_CONFIRM_URL;
    process.env.ENTITLEMENT_API_URL = previousEnv.ENTITLEMENT_API_URL;
    process.env.CONTENT_PUBLISHER_API_URL = previousEnv.CONTENT_PUBLISHER_API_URL;
  });

  it('generate-product -> publish-content -> capture-lead', async () => {
    const { container } = bootstrapApplication();

    await container.createProductHandler.execute({
      productId: 'product-e2e-1',
      name: 'Product E2E'
    });

    await container.generateContentHandler.execute({
      assetId: 'asset-e2e-1',
      productId: 'product-e2e-1',
      body: 'Automated announcement post'
    });

    await container.publishContentHandler.execute({
      publicationId: 'pub-e2e-1',
      assetId: 'asset-e2e-1',
      channel: 'web'
    });

    await container.captureLeadHandler.execute({
      leadId: 'lead-e2e-1',
      source: 'campaign-web'
    });

    await container.scoreLeadHandler.execute({
      leadId: 'lead-e2e-1',
      score: 73
    });

    expect(container.initialized).toBe(true);
  });
});
