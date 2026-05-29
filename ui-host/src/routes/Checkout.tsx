import { useNavigate } from 'react-router-dom'
import CheckoutPage from '../components/Checkout'
import { useUiStore } from '../state/uiStore'

export default function Checkout() {
  const navigate = useNavigate()
  const status = useUiStore((state) => state.checkoutStatus)
  const planName = useUiStore((state) => state.checkoutPlanName)
  const priceLabel = useUiStore((state) => state.checkoutPriceLabel)

  return (
    <CheckoutPage
      status={status}
      planName={planName}
      priceLabel={priceLabel}
      onActivate={() => {
        navigate('/automation')
      }}
    />
  )
}
