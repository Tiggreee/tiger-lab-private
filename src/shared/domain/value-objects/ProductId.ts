/** ProductId value object. */
export class ProductId {
  private readonly id: string;

  constructor(id: string) {
    const normalized = id.trim();
    if (normalized.length < 2) {
      throw new Error('ProductId must contain at least 2 characters.');
    }

    this.id = normalized;
  }

  public value(): string {
    return this.id;
  }
}
