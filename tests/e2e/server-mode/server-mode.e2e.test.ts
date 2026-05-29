import { describe, expect, it } from 'vitest';
import { bootstrapApplication } from '../../../src/shared/infrastructure/bootstrap/app-bootstrap';

describe('E2E automation flow simulation', () => {
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
