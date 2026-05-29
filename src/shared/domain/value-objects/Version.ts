/** Version value object for events and prompts. */
export class Version {
  private readonly version: string;

  constructor(version: string) {
    const normalized = version.trim();
    if (!/^\d+\.\d+\.\d+$/.test(normalized)) {
      throw new Error('Version must follow semantic format x.y.z');
    }

    this.version = normalized;
  }

  public value(): string {
    return this.version;
  }
}
