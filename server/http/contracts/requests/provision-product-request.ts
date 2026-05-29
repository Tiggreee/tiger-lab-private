export interface ProvisionProductRequest {
  readonly accountId?: string;
  readonly paymentId?: string;
  readonly userId?: string;
  readonly product?: string;
  readonly dryRun?: boolean;
}
