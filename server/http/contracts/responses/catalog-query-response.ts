export interface CatalogQueryResponse {
  readonly status: 'ok';
  readonly action: 'catalog-query';
  readonly result: Record<string, unknown>;
}
