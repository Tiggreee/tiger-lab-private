import { AlertChannel, AlertMessage } from './AlertChannel';
import { AlertRuleEngine } from './AlertRuleEngine';

export class AlertEvaluator {
  constructor(
    private readonly ruleEngine: AlertRuleEngine,
    private readonly alertChannel: AlertChannel
  ) {}

  public run(channels: string[] = ['web', 'email', 'whatsapp']): readonly AlertMessage[] {
    const results = [
      this.ruleEngine.evaluateConversionDrop(),
      this.ruleEngine.evaluatePricingAnomaly(),
      this.ruleEngine.evaluateBotOveruse(),
      ...this.ruleEngine.evaluateLeadAbsenceByChannel(channels)
    ];

    for (const result of results) {
      if (!result.triggered) {
        continue;
      }

      this.alertChannel.send({
        severity: result.severity,
        title: result.ruleId,
        details: {
          reason: result.reason,
          ...result.context
        },
        at: new Date().toISOString()
      });
    }

    return this.alertChannel.getSent();
  }
}
