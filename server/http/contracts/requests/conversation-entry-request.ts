export interface ConversationEntryRequest {
  readonly leadId?: string;
  readonly campaign?: string;
  readonly channel?: 'whatsapp' | 'dm' | 'calendar' | 'landing';
  readonly destination?: string;
  readonly message?: string;
}
