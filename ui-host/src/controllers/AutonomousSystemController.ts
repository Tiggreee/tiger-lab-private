import type { AsyncStatus, OnboardingInput } from '../../../src/ui/modern/types'

export type { AsyncStatus, OnboardingInput }

export interface ActivationFlowResult {
  readonly productId: string
  readonly leadId: string
  readonly recommendedPlan: string
  readonly checkoutAmount: number
  readonly automationPipelineId: string
  readonly diagnostics: Record<string, unknown>
  readonly emittedEvents: number
}

export interface ContinuousCycleResult {
  readonly cycles: number
  readonly emittedEvents: number
  readonly alertsEvaluated: number
}

export class AutonomousSystemController {
  private state: {
    onboarding: AsyncStatus
    dashboard: AsyncStatus
    checkout: AsyncStatus
    automation: AsyncStatus
    errorMessage: string | null
  } = {
    onboarding: 'idle',
    dashboard: 'idle',
    checkout: 'idle',
    automation: 'idle',
    errorMessage: null
  }

  public getState() {
    return { ...this.state }
  }

  public async submitOnboarding(input: OnboardingInput): Promise<void> {
    this.state = { ...this.state, onboarding: 'loading', errorMessage: null }

    if (!input.productId || !input.productName || !input.audience || !input.firstAutomation) {
      this.state = { ...this.state, onboarding: 'error', errorMessage: 'Missing onboarding fields' }
      throw new Error('Missing onboarding fields')
    }

    this.state = { ...this.state, onboarding: 'success' }
  }

  public async runActivationFlow(customerId: string, onboarding: OnboardingInput): Promise<ActivationFlowResult> {
    await this.submitOnboarding(onboarding)

    this.state = {
      ...this.state,
      dashboard: 'loading',
      checkout: 'loading',
      automation: 'loading',
      errorMessage: null
    }

    const plan = onboarding.audience.toLowerCase().includes('enterprise') ? 'enterprise' : 'starter'
    const amount = plan === 'enterprise' ? 99 : 39

    this.state = {
      ...this.state,
      dashboard: 'success',
      checkout: 'success',
      automation: 'success'
    }

    return {
      productId: onboarding.productId,
      leadId: `lead_${customerId}`,
      recommendedPlan: plan,
      checkoutAmount: amount,
      automationPipelineId: onboarding.firstAutomation || 'weekly-summary',
      diagnostics: {
        generatedAt: new Date().toISOString(),
        metrics: {
          counters: {
            'pricing.resolve.count': 1,
            'lead.created.count': 1,
            'automation.executed.count': 1
          }
        }
      },
      emittedEvents: 6
    }
  }

  public loadDashboard(): Record<string, unknown> {
    this.state = { ...this.state, dashboard: 'success' }
    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        counters: {
          'pricing.resolve.count': 1
        }
      }
    }
  }

  public async activateContinuousMode(cycles = 1): Promise<ContinuousCycleResult> {
    return {
      cycles,
      emittedEvents: cycles * 10,
      alertsEvaluated: cycles
    }
  }
}
