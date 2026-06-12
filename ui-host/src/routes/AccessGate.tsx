import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  clearDevAccessSession,
  readDevAccessSession,
  saveDevAccessSession,
  validateDevAccessSession
} from '../security/devAccessSession'
import type { DevAccessSession } from '../security/devAccessSession'

interface ApiResponseResult {
  readonly sessionToken?: string
  readonly method?: 'github' | 'qr'
  readonly actor?: 'owner' | 'owner-mobile' | 'automation-bot'
  readonly canManageChecklist?: boolean
  readonly canDeleteRecords?: boolean
  readonly ownerPinRequired?: boolean
  readonly desktopUiUrl?: string
  readonly mobileUiUrl?: string
  readonly apiBaseUrl?: string
  readonly mobileApiBaseUrl?: string
  readonly issuedAt?: string
  readonly expiresAt?: string
  readonly challengeId?: string
  readonly approveUrl?: string
  readonly pollIntervalMs?: number
}

interface ApiResponse {
  readonly status: 'ok' | 'error'
  readonly error?: string
  readonly result?: ApiResponseResult
}

interface QrChallengeState {
  readonly challengeId: string
  readonly approveUrl: string
  readonly pollIntervalMs: number
  readonly ownerPinRequired: boolean
}

interface DiscoveryState {
  readonly desktopUiUrl: string
  readonly mobileUiUrl: string
}

function resolveApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
}

function readErrorMessage(fallback: string, payload: ApiResponse): string {
  return payload.error || fallback
}

function toSession(result: ApiResponseResult | undefined): DevAccessSession | null {
  if (!result || !result.sessionToken || !result.method || !result.actor || !result.issuedAt || !result.expiresAt) {
    return null
  }

  return {
    sessionToken: result.sessionToken,
    method: result.method,
    actor: result.actor,
    canManageChecklist: Boolean(result.canManageChecklist),
    canDeleteRecords: Boolean(result.canDeleteRecords),
    issuedAt: result.issuedAt,
    expiresAt: result.expiresAt
  }
}

async function postJson(path: string): Promise<ApiResponse> {
  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: '{}'
  })

  return (await response.json()) as ApiResponse
}

async function getJson(path: string): Promise<ApiResponse> {
  const response = await fetch(`${resolveApiBaseUrl()}${path}`)
  return (await response.json()) as ApiResponse
}

export default function AccessGate() {
  const navigate = useNavigate()
  const [checkingExisting, setCheckingExisting] = useState(true)
  const [busyGithub, setBusyGithub] = useState(false)
  const [busyQr, setBusyQr] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrChallenge, setQrChallenge] = useState<QrChallengeState | null>(null)
  const [discovery, setDiscovery] = useState<DiscoveryState>({
    desktopUiUrl: 'http://localhost:5173/',
    mobileUiUrl: 'http://localhost:5173/'
  })

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const existing = readDevAccessSession()
      if (!existing) {
        if (!cancelled) {
          setCheckingExisting(false)
        }
        return
      }

      const valid = await validateDevAccessSession(existing)
      if (cancelled) {
        return
      }

      if (!valid) {
        clearDevAccessSession()
        setCheckingExisting(false)
        return
      }

      navigate('/dev/ops', { replace: true })
    }

    bootstrap()

    const uiPort = window.location.port || '5173'
    getJson(`/dev-access/discovery?uiPort=${encodeURIComponent(uiPort)}`)
      .then((payload) => {
        if (payload.status !== 'ok') {
          return
        }

        const desktopUiUrl = payload.result?.desktopUiUrl
        const mobileUiUrl = payload.result?.mobileUiUrl
        if (desktopUiUrl && mobileUiUrl) {
          setDiscovery({ desktopUiUrl, mobileUiUrl })
        }
      })
      .catch(() => {
        // Keep fallback localhost links.
      })

    return () => {
      cancelled = true
    }
  }, [navigate])

  useEffect(() => {
    if (!qrChallenge) {
      return
    }

    let cancelled = false

    async function pollStatus() {
      const challengeId = qrChallenge?.challengeId
      if (!challengeId) {
        return
      }

      const payload = await getJson(`/dev-access/unlock/qr/status?challengeId=${encodeURIComponent(challengeId)}`)
      if (cancelled) {
        return
      }

      if (payload.status !== 'ok') {
        setError(readErrorMessage('No fue posible consultar el estado del QR.', payload))
        return
      }

      const session = toSession(payload.result)
      if (!session) {
        return
      }

      saveDevAccessSession(session)
      navigate('/dev/ops', { replace: true })
    }

    const pollEveryMs = qrChallenge.pollIntervalMs > 0 ? qrChallenge.pollIntervalMs : 2000
    const timer = window.setInterval(() => {
      pollStatus().catch(() => {
        setError('Fallo al validar QR. Reintenta generar uno nuevo.')
      })
    }, pollEveryMs)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [navigate, qrChallenge])

  const qrImageUrl = useMemo(() => {
    if (!qrChallenge) {
      return ''
    }

    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrChallenge.approveUrl)}`
  }, [qrChallenge])

  async function unlockWithGitHub(): Promise<void> {
    setBusyGithub(true)
    setError(null)

    try {
      const payload = await postJson('/dev-access/unlock/github')
      if (payload.status !== 'ok') {
        setError(readErrorMessage('No se pudo desbloquear con GitHub.', payload))
        return
      }

      const session = toSession(payload.result)
      if (!session) {
        setError('La respuesta de desbloqueo no incluyo sesion valida.')
        return
      }

      saveDevAccessSession(session)
      navigate('/dev/ops', { replace: true })
    } catch {
      setError('No se logro conectar al endpoint de acceso. Verifica que el server este activo.')
    } finally {
      setBusyGithub(false)
    }
  }

  async function createQrChallenge(): Promise<void> {
    setBusyQr(true)
    setError(null)

    try {
      const payload = await postJson('/dev-access/unlock/qr/start')
      if (payload.status !== 'ok') {
        setError(readErrorMessage('No se pudo generar el QR de desbloqueo.', payload))
        return
      }

      const result = payload.result
      if (!result?.challengeId || !result.approveUrl) {
        setError('El backend no envio challengeId/approveUrl para el QR.')
        return
      }

      setQrChallenge({
        challengeId: result.challengeId,
        approveUrl: result.approveUrl,
        pollIntervalMs: result.pollIntervalMs || 2000,
        ownerPinRequired: Boolean(result.ownerPinRequired)
      })
    } catch {
      setError('No se logro crear QR. Verifica server y red local.')
    } finally {
      setBusyQr(false)
    }
  }

  return (
    <main className="devgate-shell" aria-label="Puerta de acceso developer">
      <section className="devgate-panel">
        <p className="devgate-kicker">Acceso restringido</p>
        <h1>Developer Lock Gate</h1>
        <p className="devgate-subtitle">
          Esta instancia inicia bloqueada. Solo se desbloquea con GitHub local o aprobacion por QR desde tu celular.
        </p>

        {checkingExisting ? <p className="devgate-note">Validando sesion activa...</p> : null}

        <div className="devgate-actions">
          <button type="button" className="devgate-primary" disabled={busyGithub || checkingExisting} onClick={unlockWithGitHub}>
            {busyGithub ? 'Validando...' : 'Desbloquear con GitHub (gh auth status)'}
          </button>
          <button type="button" className="devgate-secondary" disabled={busyQr || checkingExisting} onClick={createQrChallenge}>
            {busyQr ? 'Generando QR...' : 'Desbloquear por QR'}
          </button>
        </div>

        <section className="devgate-quick-links" aria-label="Accesos rapidos">
          <h2>Entrar rapido</h2>
          <a href={discovery.desktopUiUrl} target="_blank" rel="noreferrer">Entrar desde esta PC</a>
          <a href={discovery.mobileUiUrl} target="_blank" rel="noreferrer">Abrir en mi celular</a>
        </section>

        {qrChallenge ? (
          <section className="devgate-qr-box">
            <h2>Escanea con tu celular</h2>
            <p>Al abrir el link del QR, se aprobara esta sesion en tu maquina actual.</p>
            {qrChallenge.ownerPinRequired ? <p>Este QR pide PIN de owner: solo tu celular autorizado debe aprobar.</p> : null}
            {qrImageUrl ? <img src={qrImageUrl} alt="QR de aprobacion de acceso" width={260} height={260} /> : null}
            <p className="devgate-url">{qrChallenge.approveUrl}</p>
          </section>
        ) : null}

        {error ? <p className="devgate-error">{error}</p> : null}

        <p className="devgate-note">
          Despues de entrar a la UI de pendientes/desarrollo, al final tendras un acceso para ir al workspace raiz.
        </p>
      </section>
    </main>
  )
}
