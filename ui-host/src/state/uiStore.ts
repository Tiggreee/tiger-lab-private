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
