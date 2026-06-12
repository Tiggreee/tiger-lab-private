import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import {
  readDevAccessSession,
  clearDevAccessSession,
  validateDevAccessSession
} from '../security/devAccessSession'
import type { DevAccessSession } from '../security/devAccessSession'

interface RequireDevAccessProps {
  readonly children: ReactNode
}

export default function RequireDevAccess({ children }: RequireDevAccessProps) {
  const [session, setSession] = useState<DevAccessSession | null>(() => readDevAccessSession())
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function verify() {
      const current = readDevAccessSession()
      if (!current) {
        if (!cancelled) {
          setSession(null)
          setChecking(false)
        }
        return
      }

      const valid = await validateDevAccessSession(current)
      if (cancelled) {
        return
      }

      if (!valid) {
        clearDevAccessSession()
        setSession(null)
        setChecking(false)
        return
      }

      setSession(current)
      setChecking(false)
    }

    verify()

    return () => {
      cancelled = true
    }
  }, [])

  if (checking) {
    return (
      <main className="devgate-shell" aria-label="Validando acceso">
        <section className="devgate-panel">
          <h1>Validando acceso...</h1>
          <p>Comprobando sesion local y backend.</p>
        </section>
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
