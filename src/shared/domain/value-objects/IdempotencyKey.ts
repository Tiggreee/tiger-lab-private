/** IdempotencyKey value object. */
export class IdempotencyKey {
  private readonly key: string;

  constructor(key: string) {
    const normalized = key.trim();
    if (normalized.length < 8) {
      throw new Error('IdempotencyKey must contain at least 8 characters.');
    }

    this.key = normalized;
  }

  public value(): string {
    return this.key;
  }
}
