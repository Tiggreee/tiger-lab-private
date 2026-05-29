import type { AsyncStatus } from '../controllers/AutonomousSystemController'

interface CheckoutProps {
  readonly status?: AsyncStatus
  readonly planName?: string
  readonly priceLabel?: string
  readonly onActivate?: () => void
}

export default function Checkout({ status = 'idle', planName = 'Starter', priceLabel = '$49/mes', onActivate }: CheckoutProps) {
  const isLoading = status === 'loading'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="bg-gray-100 rounded-lg p-8 w-full max-w-md text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">
          {planName} - {priceLabel}
        </h3>
        <ul className="text-lg mb-6 space-y-1">
          <li>- 1 bot inteligente</li>
          <li>- 1 funnel autonomo</li>
          <li>- 1 generador de contenido</li>
          <li>- 1 pipeline de automatizacion</li>
        </ul>
        <button
          className="w-full bg-black text-white py-4 rounded-lg font-bold text-lg disabled:opacity-50"
          disabled={isLoading}
          onClick={onActivate}
          type="button"
        >
          {isLoading ? 'Procesando checkout...' : 'Activar ahora'}
        </button>
        {status === 'success' ? <p className="text-green-700 text-sm mt-3">Checkout conectado al pricing engine.</p> : null}
        {status === 'error' ? <p className="text-red-600 text-sm mt-3">Error en checkout.</p> : null}
      </div>
    </div>
  )
}
