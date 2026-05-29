export interface AlertMessage {
  readonly severity: 'info' | 'warning' | 'critical';
  readonly title: string;
  readonly details: Record<string, unknown>;
  readonly at: string;
}

export class AlertChannel {
  private readonly sent: AlertMessage[] = [];

  public send(message: AlertMessage): void {
    this.sent.push(message);
  }

  public getSent(): readonly AlertMessage[] {
    return this.sent;
  }
}
