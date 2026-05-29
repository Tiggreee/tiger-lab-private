export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export interface OnboardingInput {
  readonly productId: string
  readonly productName: string
  readonly audience: string
  readonly firstAutomation: string
}