export type CatalogQueryAction =
  | 'get-product'
  | 'get-plan'
  | 'resolve-offer'
  | 'is-available-for-channel';

export interface CatalogQueryRequest {
  readonly action: CatalogQueryAction;
  readonly productId?: string;
  readonly planId?: string;
  readonly channel?: string;
  readonly at?: string;
}
