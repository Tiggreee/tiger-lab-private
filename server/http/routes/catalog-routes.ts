import { CatalogController } from '../controllers/CatalogController';
import { validateCatalogQueryRequest } from '../contracts/validators/validate-catalog-query-request';
import { validateCatalogQueryResponse } from '../contracts/validators/validate-catalog-query-response';
import { sendJson } from '../response';
import { HttpRoute } from '../types';

function requestFromQueryString(urlValue: string): Record<string, string> {
  const url = new URL(urlValue, 'http://localhost');

  return {
    action: url.searchParams.get('action') || '',
    productId: url.searchParams.get('productId') || '',
    planId: url.searchParams.get('planId') || '',
    channel: url.searchParams.get('channel') || '',
    at: url.searchParams.get('at') || ''
  };
}

export function buildCatalogRoutes(controller: CatalogController): readonly HttpRoute[] {
  return [
    {
      method: 'GET',
      path: '/catalog/query',
      requiredScopes: ['catalog:read'],
      handler: async (ctx) => {
        const requestPayload = requestFromQueryString(ctx.req.url || '/catalog/query');
        const request = validateCatalogQueryRequest(requestPayload);
        const response = validateCatalogQueryResponse(await controller.query(request));
        sendJson(ctx.res, 200, response);
      }
    }
  ];
}
