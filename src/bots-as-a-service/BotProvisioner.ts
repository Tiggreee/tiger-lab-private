export interface ProvisionedBot {
  readonly customerId: string;
  readonly botId: string;
  readonly plan: string;
  readonly enabledChannels: string[];
}

export class BotProvisioner {
  private readonly provisioned = new Map<string, ProvisionedBot>();

  public provision(customerId: string, plan: string): ProvisionedBot {
    const enabledChannels = plan === 'enterprise' ? ['web', 'whatsapp', 'email'] : ['web', 'email'];

    const bot: ProvisionedBot = {
      customerId,
      botId: `bot_${customerId}_${plan}`,
      plan,
      enabledChannels
    };

    this.provisioned.set(customerId, bot);
    return bot;
  }

  public getByCustomer(customerId: string): ProvisionedBot | null {
    return this.provisioned.get(customerId) || null;
  }
}
