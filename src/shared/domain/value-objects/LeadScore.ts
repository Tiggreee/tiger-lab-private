/** LeadScore value object. */
export class LeadScore {
  public readonly value: number;

  constructor(value: number) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error('LeadScore must be a number between 0 and 100.');
    }

    this.value = value;
  }

  public isValidForProgression(minimum = 1): boolean {
    return this.value >= minimum;
  }
}
