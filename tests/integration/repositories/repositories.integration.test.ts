import { describe, expect, it } from 'vitest';
import { bootstrapApplication } from '../../../src/shared/infrastructure/bootstrap/app-bootstrap';

describe('In-memory repository wiring integration', () => {
  it('executes product and content handlers from shared bootstrap container', async () => {
    const { container } = bootstrapApplication();

    await container.createProductHandler.execute({
      productId: 'facturautentico-cloud',
      name: 'FacturAutentico Cloud'
    });

    await container.generateContentHandler.execute({
      assetId: 'asset-1',
      productId: 'facturautentico-cloud',
      body: 'Product launch content'
    });

    await container.publishContentHandler.execute({
      publicationId: 'pub-1',
      assetId: 'asset-1',
      channel: 'web'
    });

    expect(container.initialized).toBe(true);
  });

  it('uses CatalogFileRepository through resolveOffer handler', async () => {
    const { container } = bootstrapApplication();

    await expect(
      container.resolveOfferHandler.execute({
        productId: 'facturautentico-cloud',
        planId: 'starter',
        at: new Date('2026-06-01T00:00:00.000Z')
      })
    ).resolves.toBeUndefined();
  });
});
