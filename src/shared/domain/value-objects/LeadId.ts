/** LeadId value object. */
export class LeadId {
  private readonly id: string;

  constructor(id: string) {
    const normalized = id.trim();
    if (normalized.length < 2) {
      throw new Error('LeadId must contain at least 2 characters.');
    }

    this.id = normalized;
  }

  public value(): string {
    return this.id;
  }
}
