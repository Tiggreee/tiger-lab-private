export interface GenerateContentRequest {
  readonly assetId?: string;
  readonly product?: string;
  readonly productId?: string;
  readonly type?: string;
  readonly channel?: string;
  readonly body?: string;
  readonly dryRun?: boolean;
}
