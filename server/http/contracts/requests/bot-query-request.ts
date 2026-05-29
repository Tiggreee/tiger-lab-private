export interface BotQueryRequest {
  readonly message?: string;
  readonly leadId?: string;
  readonly score?: number;
  readonly productId?: string;
  readonly planId?: string;
  readonly dryRun?: boolean;
}
