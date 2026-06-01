import { useState } from 'react'
import type { AsyncStatus, OnboardingInput } from '../controllers/AutonomousSystemController'

interface OnboardingFormProps {
  readonly status?: AsyncStatus
  readonly errorMessage?: string | null
  readonly onSubmit?: (input: OnboardingInput) => void | Promise<void>
}

export default function OnboardingForm({ status = 'idle', errorMessage = null, onSubmit }: OnboardingFormProps) {
  const productName = 'FacturaAutentica'
  const productId = 'facturaautentica'
  const [audience, setAudience] = useState('')
  const [firstAutomation, setFirstAutomation] = useState('follow-up-cobro')
  const isLoading = status === 'loading'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!onSubmit) {
      return
    }

    await onSubmit({
      productId,
      productName,
      audience,
      firstAutomation
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <h2 className="text-2xl font-bold mb-3">Onboarding FacturaAutentica</h2>
      <p className="mb-6 text-sm text-neutral-600">Producto fijado al foco actual del milestone.</p>
      <form className="space-y-4 w-full max-w-sm" onSubmit={handleSubmit}>
        <input className="w-full border p-3 rounded bg-neutral-100" disabled value={productName} />
        <input
          className="w-full border p-3 rounded"
          onChange={(event) => setAudience(event.target.value)}
          placeholder="Segmento objetivo (ej. despachos contables SMB)"
          value={audience}
        />
        <input
          className="w-full border p-3 rounded"
          onChange={(event) => setFirstAutomation(event.target.value)}
          placeholder="Primera automatizacion (ej. follow-up-cobro)"
          value={firstAutomation}
        />
        <button className="w-full bg-black text-white py-3 rounded font-bold mt-4 disabled:opacity-50" disabled={isLoading} type="submit">
          {isLoading ? 'Creando...' : 'Activar flujo FacturaAutentica'}
        </button>
        {status === 'error' && errorMessage ? <p className="text-red-600 text-sm">{errorMessage}</p> : null}
        {status === 'success' ? <p className="text-green-700 text-sm">Onboarding listo y alineado al foco comercial.</p> : null}
      </form>
    </div>
  )
}
