/** Currency value object. */
export class Currency {
  private readonly code: string;

  constructor(code: string) {
    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized)) {
      throw new Error('Currency must be a 3-letter ISO code.');
    }

    this.code = normalized;
  }

  public value(): string {
    return this.code;
  }
}
