export interface GenerateContentResponse {
  readonly status: 'ok';
  readonly action: 'generate-content';
  readonly result: {
    readonly contentId: string;
    readonly file: string;
    readonly channel: string;
    readonly dryRun: boolean;
  };
}
