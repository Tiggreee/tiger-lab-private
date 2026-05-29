import { describe, expect, it } from 'vitest';
import { CatalogController } from '../../../server/http/controllers/CatalogController';
import { validateCatalogQueryRequest } from '../../../server/http/contracts/validators/validate-catalog-query-request';
import { validateCatalogQueryResponse } from '../../../server/http/contracts/validators/validate-catalog-query-response';
import { validateGenerateProductRequest } from '../../../server/http/contracts/validators/validate-generate-product-request';

describe('HTTP contract tests', () => {
  it('rejects invalid generate-product request contract', () => {
    expect(() => validateGenerateProductRequest({ repo: 123 })).toThrowError('repo must be a string.');
  });

  it('validates catalog request/response contract for resolve-offer endpoint', async () => {
    const request = validateCatalogQueryRequest({
      action: 'resolve-offer',
      productId: 'facturautentico-cloud',
      planId: 'starter'
    });

    const controller = new CatalogController();
    const response = validateCatalogQueryResponse(await controller.query(request));

    expect(response.status).toBe('ok');
    expect(response.action).toBe('catalog-query');
    expect(response.result).toHaveProperty('data');
  });
});
