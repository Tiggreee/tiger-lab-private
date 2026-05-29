export interface BotQueryResponse {
  readonly status: 'ok';
  readonly action: 'bot-query';
  readonly result: {
    readonly reply: string;
    readonly recommendation: string;
    readonly dryRun: boolean;
  };
}
