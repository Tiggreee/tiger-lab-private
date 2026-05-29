export interface ChannelPolicy {
  readonly channel: 'web' | 'whatsapp' | 'email' | 'internal';
  readonly allowedActions: string[];
  readonly maxResponseLength: number;
}

const CHANNEL_POLICIES: Record<ChannelPolicy['channel'], ChannelPolicy> = {
  web: {
    channel: 'web',
    allowedActions: ['collect_requirements', 'send_checkout', 'provision_account', 'handoff_to_sales'],
    maxResponseLength: 500
  },
  whatsapp: {
    channel: 'whatsapp',
    allowedActions: ['collect_requirements', 'send_checkout', 'handoff_to_sales'],
    maxResponseLength: 280
  },
  email: {
    channel: 'email',
    allowedActions: ['collect_requirements', 'send_checkout', 'request_payment_method', 'handoff_to_sales'],
    maxResponseLength: 1200
  },
  internal: {
    channel: 'internal',
    allowedActions: ['collect_requirements', 'send_checkout', 'request_payment_method', 'provision_account', 'handoff_to_sales'],
    maxResponseLength: 2000
  }
};

export function getChannelPolicy(channel: ChannelPolicy['channel']): ChannelPolicy {
  return CHANNEL_POLICIES[channel] || CHANNEL_POLICIES.web;
}
