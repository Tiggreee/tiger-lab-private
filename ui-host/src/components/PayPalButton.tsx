import { useEffect, useRef, useState } from 'react'

interface PayPalButtonProps {
  readonly onSuccess: () => void
  readonly onError: (error: Error) => void
}

declare global {
  interface Window {
    paypal?: any
  }
}

const resolvePayPalClientId = (): string => {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined
  if (clientId && clientId.trim().length > 0) {
    return clientId.trim()
  }

  if (import.meta.env.DEV) {
    return 'sb'
  }

  throw new Error('Missing VITE_PAYPAL_CLIENT_ID in production mode.')
}

const getPayPalSdkUrl = (): string =>
  `https://www.paypal.com/sdk/js?client-id=${resolvePayPalClientId()}&currency=USD`

const resolvePublicApiKey = (): string => {
  const explicitKey = import.meta.env.VITE_PUBLIC_API_KEY as string | undefined
  if (explicitKey && explicitKey.trim().length > 0) {
    return explicitKey.trim()
  }

  if (import.meta.env.DEV) {
    return 'dev-public-key'
  }

  throw new Error('Missing VITE_PUBLIC_API_KEY for checkout request in production mode.')
}

const buildCheckoutCallbackUrl = (path: string): string => {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return import.meta.env.PROD ? `${origin}/#${path}` : `${origin}${path}`
}

const loadPayPalScript = async (): Promise<void> => {
  if (typeof window === 'undefined') {
    throw new Error('PayPal SDK can only load in the browser.')
  }

  if (window.paypal) {
    return
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src^="https://www.paypal.com/sdk/js"]`)
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve())
      existingScript.addEventListener('error', () => reject(new Error('Failed to load PayPal SDK script.')))
      return
    }

    const script = document.createElement('script')
    script.src = getPayPalSdkUrl()
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load PayPal SDK script.'))
    document.body.appendChild(script)
  })
}

export default function PayPalButton({ onSuccess, onError }: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [initializationError, setInitializationError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    loadPayPalScript()
      .then(() => {
        if (!active) return
        if (!window.paypal) {
          throw new Error('PayPal SDK loaded but window.paypal is not available.')
        }
        setIsReady(true)
      })
      .catch((error) => {
        if (!active) return
        setInitializationError(error instanceof Error ? error.message : String(error))
        onError(error instanceof Error ? error : new Error(String(error)))
      })

    return () => {
      active = false
    }
  }, [onError])

  useEffect(() => {
    if (!isReady || !containerRef.current || !window.paypal) {
      return
    }

    const buttons = window.paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal'
      },
      createOrder: async () => {
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
          const errorText = await response.text()
          throw new Error(`Checkout session creation failed: ${response.status} ${errorText}`)
        }

        const payload = (await response.json()) as { result?: { sessionId?: string } }
        const orderId = payload?.result?.sessionId

        if (!orderId) {
          throw new Error('PayPal checkout session did not return an order ID.')
        }

        return orderId
      },
      onApprove: async (data: { orderID: string }, actions: any) => {
        const details = await actions.order.capture()
        const orderId = data.orderID || details.id

        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
        const publicApiKey = resolvePublicApiKey()
        const response = await fetch(`${apiBaseUrl}/register-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': publicApiKey
          },
          body: JSON.stringify({
            paymentId: orderId,
            customerId: `paypal-${orderId}`,
            productId: 'facturautentico-cloud',
            planId: 'starter',
            amount: 39,
            currency: 'USD'
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Payment registration failed: ${response.status} ${errorText}`)
        }

        onSuccess()
      },
      onError: (error: unknown) => {
        onError(error instanceof Error ? error : new Error(String(error)))
      }
    })

    buttons.render(containerRef.current)

    return () => {
      if (buttons && typeof buttons.close === 'function') {
        buttons.close()
      }
    }
  }, [isReady, onError, onSuccess])

  return (
    <div className="space-y-3">
      {initializationError ? (
        <p className="text-red-600">Error PayPal: {initializationError}</p>
      ) : (
        <div ref={containerRef} />
      )}
    </div>
  )
}
