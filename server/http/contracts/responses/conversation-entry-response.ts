export interface ConversationEntryResponse {
  readonly status: 'ok';
  readonly action: 'conversation-entry';
  readonly result: {
    readonly leadId: string;
    readonly channel: string;
    readonly destination: string;
    readonly message: string;
    readonly entryLink: string;
  };
}
