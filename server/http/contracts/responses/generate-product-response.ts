export interface GenerateProductResponse {
  readonly status: 'ok';
  readonly action: 'generate-product';
  readonly result: {
    readonly productId: string;
    readonly version: string;
    readonly artifactPath: string;
    readonly dryRun: boolean;
  };
}
