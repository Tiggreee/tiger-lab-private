/** CausationId value object. */
export class CausationId {
  private readonly id: string;

  constructor(id: string) {
    const normalized = id.trim();
    if (normalized.length < 8) {
      throw new Error('CausationId must contain at least 8 characters.');
    }

    this.id = normalized;
  }

  public value(): string {
    return this.id;
  }
}
