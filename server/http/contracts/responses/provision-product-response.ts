export interface ProvisionProductResponse {
  readonly status: 'ok';
  readonly action: 'provision-product';
  readonly result: {
    readonly accountId: string;
    readonly userId: string;
    readonly product: string;
    readonly apiKeyHint: string;
    readonly dryRun: boolean;
  };
}
