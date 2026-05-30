export interface PublishContentResponse {
  readonly status: 'ok';
  readonly action: 'publish-content';
  readonly result: {
    readonly publicationId: string;
    readonly assetId: string;
    readonly channel: string;
    readonly dryRun: boolean;
  };
}
