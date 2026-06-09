import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CheckoutPage from '../components/Checkout'
import { useUiStore } from '../state/uiStore'

export default function Checkout() {
  const navigate = useNavigate()
  const status = useUiStore((state) => state.checkoutStatus)
  const planName = useUiStore((state) => state.checkoutPlanName)
  const priceLabel = useUiStore((state) => state.checkoutPriceLabel)
  const [paypalErrorMessage, setPaypalErrorMessage] = useState<string | null>(null)

  return (
    <CheckoutPage
      status={status}
      planName={planName}
      priceLabel={priceLabel}
      paypalErrorMessage={paypalErrorMessage}
      onPayPalSuccess={() => {
        navigate('/checkout/success')
      }}
      onPayPalError={(error) => {
        setPaypalErrorMessage(error.message || 'Error en el flujo de PayPal. Intenta nuevamente.')
      }}
    />
  )
}
