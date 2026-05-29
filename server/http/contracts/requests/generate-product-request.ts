export interface GenerateProductRequest {
  readonly repo?: string;
  readonly type?: string;
  readonly productId?: string;
  readonly name?: string;
  readonly dryRun?: boolean;
}
