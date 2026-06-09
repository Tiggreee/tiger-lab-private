import { create } from 'zustand'
import type { OnboardingInput, AsyncStatus } from '../controllers/AutonomousSystemController'
import { AutonomousSystemController } from '../controllers/AutonomousSystemController'

interface DashboardSnapshot {
  readonly leadsToday: number
  readonly generatedContent: number
  readonly activeBots: number
  readonly averagePrice: string
}

interface UiState {
  readonly controller: AutonomousSystemController
  readonly onboardingStatus: AsyncStatus
  readonly dashboardStatus: AsyncStatus
  readonly checkoutStatus: AsyncStatus
  readonly automationStatus: AsyncStatus
  readonly errorMessage: string | null
  readonly logs: string[]
  readonly onboardingInput: OnboardingInput
  readonly dashboard: DashboardSnapshot
  readonly checkoutPlanName: string
  readonly checkoutPriceLabel: string
  submitOnboarding: (input: OnboardingInput) => Promise<void>
  activateMonetization: () => Promise<void>
  startCheckout: () => Promise<void>
  loadDashboard: () => void
  runAutomationAction: (action: 'product' | 'content' | 'traffic') => Promise<void>
}

const controller = new AutonomousSystemController()

const defaultInput: OnboardingInput = {
  productId: 'facturaautentica',
  productName: 'FacturaAutentica',
  audience: 'Despachos contables SMB',
  firstAutomation: 'follow-up-cobro'
}

function parseDiagnosticsAveragePrice(diagnostics: Record<string, unknown>): string {
  const metrics = diagnostics.metrics as { counters?: Record<string, number> } | undefined
  const pricingCounter = metrics?.counters?.['pricing.resolve.count'] || 0
  if (pricingCounter === 0) {
    return '$0.00'
  }

  return '$39.00'
}

function buildCheckoutCallbackUrl(path: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return import.meta.env.PROD ? `${origin}/#${path}` : `${origin}${path}`
}

function resolvePublicApiKey(): string {
  const explicitKey = import.meta.env.VITE_PUBLIC_API_KEY as string | undefined
  if (explicitKey && explicitKey.trim().length > 0) {
    return explicitKey.trim()
  }

  if (import.meta.env.DEV) {
    return 'dev-public-key'
  }

  throw new Error('Missing VITE_PUBLIC_API_KEY for checkout request in production mode.')
}

export const useUiStore = create<UiState>((set, get) => ({
  controller,
  onboardingStatus: 'idle',
  dashboardStatus: 'idle',
  checkoutStatus: 'idle',
  automationStatus: 'idle',
  errorMessage: null,
  logs: [],
  onboardingInput: defaultInput,
  dashboard: {
    leadsToday: 0,
    generatedContent: 0,
    activeBots: 1,
    averagePrice: '$0.00'
  },
  checkoutPlanName: 'FacturaAutentica Starter',
  checkoutPriceLabel: '$39.00 MXN',
  submitOnboarding: async (input: OnboardingInput) => {
    set({ onboardingStatus: 'loading', errorMessage: null })

    try {
      await get().controller.submitOnboarding(input)
      set({
        onboardingStatus: 'success',
        onboardingInput: input,
        logs: [...get().logs, `Onboarding creado para ${input.productId}`]
      })
    } catch (error) {
      set({
        onboardingStatus: 'error',
        errorMessage: error instanceof Error ? error.message : 'Onboarding error'
      })
      throw error
    }
  },
  activateMonetization: async () => {
    const input = get().onboardingInput
    set({
      dashboardStatus: 'loading',
      checkoutStatus: 'loading',
      automationStatus: 'loading',
      errorMessage: null
    })

    try {
      const result = await get().controller.runActivationFlow('ui-host-customer-1', input)
      set({
        dashboardStatus: 'success',
        checkoutStatus: 'success',
        automationStatus: 'success',
        checkoutPlanName: result.recommendedPlan,
        checkoutPriceLabel: `$${result.checkoutAmount.toFixed(2)}`,
        dashboard: {
          leadsToday: 1,
          generatedContent: 1,
          activeBots: 1,
          averagePrice: parseDiagnosticsAveragePrice(result.diagnostics)
        },
        logs: [
          ...get().logs,
          `Lead ${result.leadId} capturado`,
          `Plan recomendado: ${result.recommendedPlan}`,
          `Pipeline ${result.automationPipelineId} activado`,
          `Eventos emitidos: ${result.emittedEvents}`
        ]
      })
    } catch (error) {
      set({
        dashboardStatus: 'error',
        checkoutStatus: 'error',
        automationStatus: 'error',
        errorMessage: error instanceof Error ? error.message : 'Activation flow error'
      })
      throw error
    }
  },
  startCheckout: async () => {
    set({ checkoutStatus: 'loading', errorMessage: null })

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
      const publicApiKey = resolvePublicApiKey()
      const returnUrl = buildCheckoutCallbackUrl('/checkout/success')
      const cancelUrl = buildCheckoutCallbackUrl('/checkout/cancel')
      const response = await fetch(`${apiBaseUrl}/billing/checkout/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': publicApiKey
        },
        body: JSON.stringify({
          productId: 'facturautentico-cloud',
          planId: 'starter',
          amount: 39,
          currency: 'USD',
          returnUrl,
          cancelUrl
        })
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Checkout session request failed: ${response.status} ${errorBody}`)
      }

      const payload = (await response.json()) as { result?: { approvalUrl?: string } }
      const approvalUrl = payload?.result?.approvalUrl
      if (!approvalUrl) {
        throw new Error('PayPal approval URL was not returned.')
      }

      set({ checkoutStatus: 'success' })
      window.location.assign(approvalUrl)
    } catch (error) {
      set({ checkoutStatus: 'error', errorMessage: error instanceof Error ? error.message : 'Checkout error' })
      throw error
    }
  },
  loadDashboard: () => {
    const diagnostics = get().controller.loadDashboard()
    set({
      dashboardStatus: 'success',
      dashboard: {
        leadsToday: 0,
        generatedContent: 0,
        activeBots: 1,
        averagePrice: parseDiagnosticsAveragePrice(diagnostics)
      },
      logs: [...get().logs, 'Dashboard de metricas actualizado']
    })
  },
  runAutomationAction: async (action: 'product' | 'content' | 'traffic') => {
    set({ automationStatus: 'loading', errorMessage: null })

    try {
      if (action === 'product') {
        await get().controller.activateContinuousMode(1)
      }

      if (action === 'content') {
        await get().controller.activateContinuousMode(1)
      }

      if (action === 'traffic') {
        await get().controller.activateContinuousMode(1)
      }

      set({
        automationStatus: 'success',
        logs: [...get().logs, `Accion de automatizacion ejecutada: ${action}`]
      })
    } catch (error) {
      set({
        automationStatus: 'error',
        errorMessage: error instanceof Error ? error.message : 'Automation action error'
      })
      throw error
    }
  }
}))
