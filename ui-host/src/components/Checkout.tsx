import type { AsyncStatus } from '../controllers/AutonomousSystemController'
import PayPalButton from './PayPalButton'

interface CheckoutProps {
  readonly status?: AsyncStatus
  readonly planName?: string
  readonly priceLabel?: string
  readonly onPayPalSuccess?: (() => void) | null
  readonly onPayPalError?: ((error: Error) => void) | null
  readonly paypalErrorMessage?: string | null
}

export default function Checkout({
  status = 'idle',
  planName = 'Starter',
  priceLabel = '$49/mes',
  onPayPalSuccess = null,
  onPayPalError = null,
  paypalErrorMessage = null
}: CheckoutProps) {
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
        <div className="space-y-4">
          <PayPalButton
            onSuccess={() => {
              if (typeof onPayPalSuccess === 'function') {
                onPayPalSuccess()
              }
            }}
            onError={(error) => {
              if (typeof onPayPalError === 'function') {
                onPayPalError(error)
              } else {
                console.error('PayPal button error', error)
              }
            }}
          />
        </div>
        {status === 'success' ? <p className="text-green-700 text-sm mt-3">Checkout conectado al pricing engine.</p> : null}
        {status === 'error' ? <p className="text-red-600 text-sm mt-3">Error en checkout.</p> : null}
        {paypalErrorMessage ? <p className="text-red-600 text-sm mt-3">{paypalErrorMessage}</p> : null}
      </div>
    </div>
  )
}
