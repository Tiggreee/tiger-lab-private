import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LandingPage from '../components/LandingPage'
import { useUiStore } from '../state/uiStore'

const SUBDOMAIN_REDIRECTS: Record<string, string> = {
  factura: '/onboarding?product=facturaautentica',
  money: '/onboarding?product=all-about-money',
  cloud: '/onboarding?product=facturautentico-cloud',
  kit: '/onboarding?product=script-premium-kit'
}

function buildNavigationTarget(targetPath: string) {
  if (import.meta.env.PROD) {
    return `/#${targetPath}`
  }

  return targetPath
}

function trackVisit(routeLabel: string) {
  try {
    const payload = {
      type: 'entry_visit',
      routeLabel,
      host: window.location.host,
      path: window.location.pathname,
      timestamp: new Date().toISOString()
    }

    const historyKey = 'tigrelabs-entry-visits'
    const previous = JSON.parse(localStorage.getItem(historyKey) || '[]') as unknown[]
    const next = [payload, ...previous].slice(0, 100)
    localStorage.setItem(historyKey, JSON.stringify(next))

    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      navigator.sendBeacon('/api/track/visit', blob)
    }
  } catch {
    // Keep entry flow resilient even if tracking is blocked.
  }
}

export default function Landing() {
  const navigate = useNavigate()
  const onboardingStatus = useUiStore((state) => state.onboardingStatus)

  const host = typeof window === 'undefined' ? '' : window.location.hostname.toLowerCase()
  const parts = host.split('.').filter(Boolean)
  const subdomain = parts.length > 2 ? parts[0] : ''
  const mappedRoute = subdomain ? SUBDOMAIN_REDIRECTS[subdomain] : ''

  useEffect(() => {
    if (mappedRoute) {
      trackVisit(`subdomain:${subdomain}`)
      window.location.replace(buildNavigationTarget(mappedRoute))
      return
    }

    trackVisit('root')
  }, [mappedRoute, subdomain])

  return (
    <LandingPage
      activeRouteLabel={mappedRoute ? `subdomain:${subdomain}` : 'root'}
      status={onboardingStatus}
      onStart={() => {
        navigate('/onboarding')
      }}
    />
  )
}
