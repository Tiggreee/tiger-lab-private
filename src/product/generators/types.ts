export interface CommercialMetadata {
  readonly plan: string;
  readonly features: string[];
  readonly limits: Record<string, number>;
}

export interface GeneratedProductArtifact {
  readonly productId: string;
  readonly generatorType: 'micro-saas' | 'api-template' | 'script-premium';
  readonly files: string[];
  readonly metadata: CommercialMetadata;
}
