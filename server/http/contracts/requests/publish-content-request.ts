export interface PublishContentRequest {
  readonly publicationId?: string;
  readonly assetId?: string;
  readonly channel?: string;
  readonly dryRun?: boolean;
}
