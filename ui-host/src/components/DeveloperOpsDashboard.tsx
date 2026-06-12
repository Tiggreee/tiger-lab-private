import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUiStore } from '../state/uiStore'
import { readDevAccessSession, saveDevAccessSession } from '../security/devAccessSession'

type GapSeverity = 'critical' | 'high' | 'medium'

interface GapItem {
  readonly id: string
  readonly title: string
  readonly detail: string
  readonly severity: GapSeverity
  readonly requiresHuman: boolean
}

const STORAGE_KEYS = {
  approvals: 'engine-dev-approvals-v1',
  approvalStamps: 'engine-dev-approval-stamps-v1',
  sealAt: 'engine-dev-seal-at-v1',
  ideas: 'engine-dev-ideas-v1',
  notes: 'engine-dev-vmdev-notes-v1'
}

const CHECK_CONFIRM_WINDOW_MS = 24 * 60 * 60 * 1000

const GAPS: readonly GapItem[] = [
  {
    id: 'lock-gate-auto-on-vscode-open',
    title: 'Verificar lock gate automatico al abrir VS Code',
    detail: 'Confirmar que tasks folderOpen inicien backend/UI y muestren gate sin comandos manuales.',
    severity: 'critical',
    requiresHuman: true
  },
  {
    id: 'qr-owner-device-only',
    title: 'Restringir QR al celular del owner',
    detail: 'No aceptar cualquier celular: exigir validacion por secreto del owner o dispositivo autorizado.',
    severity: 'critical',
    requiresHuman: true
  },
  {
    id: 'lock-gate-mini-access-ui',
    title: 'Mini UI de accesos (PC y celular)',
    detail: 'Mostrar de forma simple el enlace local y enlace/red para celular dentro de la puerta de acceso.',
    severity: 'high',
    requiresHuman: false
  },
  {
    id: 'bot-coverage-paper-pack',
    title: 'Formalizar cobertura de bots papel faltantes',
    detail: 'Alinear bots operativos de reconciliacion, incidentes, release gate, supervisor y market-research.',
    severity: 'high',
    requiresHuman: true
  },
  {
    id: 'bot-runtime-wiring-plan',
    title: 'Plan de wiring runtime para bots nuevos',
    detail: 'Definir como cada bot papel pasa a flujo ejecutable (scripts, rutas, command-center, alertas).',
    severity: 'high',
    requiresHuman: true
  },
  {
    id: 'launch-real-campaign',
    title: 'Lanzar 1 campana real con seguimiento de pago',
    detail: 'El engine tiene rieles tecnicos, pero falta una venta real cerrada desde trafico a checkout.',
    severity: 'critical',
    requiresHuman: true
  },
  {
    id: 'landing-dynamic-product',
    title: 'Landing dinamica por producto',
    detail: 'Cada campana debe mostrar propuesta, precio y CTA especificos por producto.',
    severity: 'critical',
    requiresHuman: true
  },
  {
    id: 'market-research-ai-bridge',
    title: 'Ejecutar market-research para producto "lazo entre IAs"',
    detail: 'Investigar demanda real, ticket esperado, buyer persona y canales para un conector universal de IAs.',
    severity: 'high',
    requiresHuman: true
  },
  {
    id: 'checkout-default-product',
    title: 'Quitar dependencia de producto default en checkout',
    detail: 'Evitar que todo flujo no especificado termine en facturautentico-cloud.',
    severity: 'high',
    requiresHuman: false
  },
  {
    id: 'define-pac-strategy',
    title: 'Definir estrategia PAC por fase (off/byo/managed)',
    detail: 'No activar modo managed sin validacion comercial de mercado y clientes pagos.',
    severity: 'medium',
    requiresHuman: true
  }
]

const FINISHED_PRODUCTS = [
  {
    name: 'tigre-labs-context-engine',
    status: 'imported-to-monolith',
    location: 'products/finished/tigre-labs-context-engine',
    note: 'Producto importado desde repo externo para operarlo en modo monolito.'
  }
] as const

const BOT_COVERAGE = {
  active: ['SalesBot', 'ContentBot', 'ProvisionBot', 'FAQBot'],
  paperPending: ['ReconciliationBot', 'IncidentBot', 'ReleaseGateBot', 'SupervisorSyncBot', 'MarketResearchBot']
} as const

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return fallback
    }

    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function saveJsonStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function severityLabel(severity: GapSeverity): string {
  if (severity === 'critical') {
    return 'Critico'
  }

  if (severity === 'high') {
    return 'Alto'
  }

  return 'Medio'
}

function nowIso(): string {
  return new Date().toISOString()
}

function resolveApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
}

export default function DeveloperOpsDashboard() {
  const runAutomationAction = useUiStore((state) => state.runAutomationAction)
  const loadDashboard = useUiStore((state) => state.loadDashboard)
  const activateMonetization = useUiStore((state) => state.activateMonetization)
  const logs = useUiStore((state) => state.logs)
  const dashboard = useUiStore((state) => state.dashboard)
  const automationStatus = useUiStore((state) => state.automationStatus)
  const dashboardStatus = useUiStore((state) => state.dashboardStatus)
  const checkoutStatus = useUiStore((state) => state.checkoutStatus)
  const errorMessage = useUiStore((state) => state.errorMessage)

  const [approvals, setApprovals] = useState<Record<string, boolean>>(() =>
    readJsonStorage<Record<string, boolean>>(STORAGE_KEYS.approvals, {})
  )
  const [approvalStamps, setApprovalStamps] = useState<Record<string, string>>(() =>
    readJsonStorage<Record<string, string>>(STORAGE_KEYS.approvalStamps, {})
  )
  const [sealedAt, setSealedAt] = useState<string>(() => localStorage.getItem(STORAGE_KEYS.sealAt) || '')

  const [ideas, setIdeas] = useState<string[]>(() => readJsonStorage<string[]>(STORAGE_KEYS.ideas, []))
  const [newIdea, setNewIdea] = useState('')

  const [vmdevNotes, setVmdevNotes] = useState<string>(() => localStorage.getItem(STORAGE_KEYS.notes) || '')
  const [deleteGuardMessage, setDeleteGuardMessage] = useState<string>('')

  const accessSession = readDevAccessSession()
  const canManageChecklist = Boolean(accessSession?.canManageChecklist)
  const canDeleteRecords = Boolean(accessSession?.canDeleteRecords)
  const actorLabel = accessSession?.actor || 'unknown'

  const technicalReadyForAutoClear =
    automationStatus === 'success' &&
    dashboardStatus === 'success' &&
    checkoutStatus === 'success' &&
    !errorMessage

  const pendingRequired = useMemo(
    () => GAPS.filter((item) => item.requiresHuman && !approvals[item.id]),
    [approvals]
  )

  const canSeal = pendingRequired.length === 0
  const sealed = Boolean(sealedAt)

  async function runAction(action: 'product' | 'content' | 'traffic') {
    await runAutomationAction(action)
  }

  async function refreshDiagnostics() {
    loadDashboard()
  }

  async function executeActivationFlow() {
    await activateMonetization()
  }

  function toggleApproval(gapId: string) {
    if (!canManageChecklist) {
      return
    }

    const nextValue = !approvals[gapId]
    const next = {
      ...approvals,
      [gapId]: nextValue
    }

    const nextStamps = {
      ...approvalStamps,
      [gapId]: nextValue ? nowIso() : ''
    }

    setApprovals(next)
    saveJsonStorage(STORAGE_KEYS.approvals, next)
    setApprovalStamps(nextStamps)
    saveJsonStorage(STORAGE_KEYS.approvalStamps, nextStamps)
  }

  function sealSprint() {
    if (!canSeal) {
      return
    }

    const stamp = nowIso()
    setSealedAt(stamp)
    localStorage.setItem(STORAGE_KEYS.sealAt, stamp)
  }

  function resetSealAndApprovals() {
    if (!canManageChecklist || !canDeleteRecords) {
      return
    }

    setSealedAt('')
    localStorage.removeItem(STORAGE_KEYS.sealAt)
    setApprovals({})
    localStorage.removeItem(STORAGE_KEYS.approvals)
    setApprovalStamps({})
    localStorage.removeItem(STORAGE_KEYS.approvalStamps)
  }

  function maybeAutoClearOneDayChecks() {
    if (!canManageChecklist || !technicalReadyForAutoClear) {
      return
    }

    const now = Date.now()
    const nextApprovals = { ...approvals }
    const nextStamps = { ...approvalStamps }
    let changed = false

    for (const gap of GAPS) {
      if (!nextApprovals[gap.id]) {
        continue
      }

      const stamp = nextStamps[gap.id]
      if (!stamp) {
        continue
      }

      if (now - Date.parse(stamp) >= CHECK_CONFIRM_WINDOW_MS) {
        nextApprovals[gap.id] = false
        nextStamps[gap.id] = ''
        changed = true
      }
    }

    if (!changed) {
      return
    }

    setApprovals(nextApprovals)
    saveJsonStorage(STORAGE_KEYS.approvals, nextApprovals)
    setApprovalStamps(nextStamps)
    saveJsonStorage(STORAGE_KEYS.approvalStamps, nextStamps)
    setSealedAt('')
    localStorage.removeItem(STORAGE_KEYS.sealAt)
  }

  useEffect(() => {
    maybeAutoClearOneDayChecks()
  }, [approvals, approvalStamps, canManageChecklist, technicalReadyForAutoClear])

  useEffect(() => {
    if (canManageChecklist && !canDeleteRecords) {
      void validateDeleteLock()
    }
  }, [canManageChecklist, canDeleteRecords])

  function addIdea() {
    const trimmed = newIdea.trim()
    if (!trimmed) {
      return
    }

    const next = [trimmed, ...ideas].slice(0, 50)
    setIdeas(next)
    saveJsonStorage(STORAGE_KEYS.ideas, next)
    setNewIdea('')
  }

  function removeIdea(index: number) {
    if (!canDeleteRecords) {
      return
    }

    const next = ideas.filter((_, idx) => idx !== index)
    setIdeas(next)
    saveJsonStorage(STORAGE_KEYS.ideas, next)
  }

  async function validateDeleteLock() {
    const token = accessSession?.sessionToken
    if (!token) {
      setDeleteGuardMessage('Sesion no valida para desbloquear borrado.')
      return
    }

    try {
      const endpoint = `${resolveApiBaseUrl()}/dev-access/delete-lock/validate?token=${encodeURIComponent(token)}`
      const response = await fetch(endpoint)
      const payload = (await response.json()) as { status: 'ok' | 'error'; error?: string; result?: { detail?: string } }

      if (!response.ok || payload.status !== 'ok') {
        setDeleteGuardMessage(payload.error || 'No se pudo validar desbloqueo de borrado.')
        return
      }

      const detail = payload.result?.detail || 'Validacion OK.'

      const validateResponse = await fetch(
        `${resolveApiBaseUrl()}/dev-access/session/validate?token=${encodeURIComponent(token)}`
      )
      if (validateResponse.ok) {
        const validatePayload = (await validateResponse.json()) as {
          result?: {
            sessionToken: string
            method: 'github' | 'qr'
            actor: 'owner' | 'owner-mobile' | 'automation-bot'
            canManageChecklist: boolean
            canDeleteRecords: boolean
            issuedAt: string
            expiresAt: string
          }
        }

        if (validatePayload.result) {
          saveDevAccessSession(validatePayload.result)
        }
      }

      setDeleteGuardMessage(`Borrado desbloqueado temporalmente. ${detail}`)
    } catch {
      setDeleteGuardMessage('Fallo al validar borrado. Verifica backend activo.')
    }
  }

  function updateVmdevNotes(value: string) {
    setVmdevNotes(value)
    localStorage.setItem(STORAGE_KEYS.notes, value)
  }

  return (
    <main className="devops-page" aria-label="Developer operations dashboard">
      <header className="devops-header">
        <div>
          <p className="devops-kicker">Developer only</p>
          <h1>Engine Control Board</h1>
          <p className="devops-subtitle">Gaps reales, aprobacion humana y sello de sprint antes de ejecutar acciones sensibles.</p>
          <p className="devops-subtitle">Checklist manager: {actorLabel}</p>
        </div>
        <div className="devops-status-grid">
          <span className="devops-chip">Automation: {automationStatus}</span>
          <span className="devops-chip">Dashboard: {dashboardStatus}</span>
          <span className="devops-chip">Checkout: {checkoutStatus}</span>
          <span className={sealed ? 'devops-chip devops-chip-success' : 'devops-chip devops-chip-warning'}>
            {sealed ? `Sello activo ${sealedAt}` : 'Sin sello activo'}
          </span>
        </div>
      </header>

      <section className="devops-grid">
        <article className="devops-card">
          <h2>Aprobacion y Sello</h2>
          <p className="devops-muted">No se habilitan ejecuciones de sprint hasta sellar tareas humanas criticas.</p>
          <ul className="devops-gap-list">
            {GAPS.map((gap) => {
              const approved = Boolean(approvals[gap.id])
              return (
                <li key={gap.id} className="devops-gap-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={approved}
                      disabled={!canManageChecklist}
                      onChange={() => toggleApproval(gap.id)}
                    />
                    <span className="devops-gap-title">{gap.title}</span>
                    <span className={`devops-badge devops-badge-${gap.severity}`}>{severityLabel(gap.severity)}</span>
                    {gap.requiresHuman ? <span className="devops-badge devops-badge-human">Humano</span> : null}
                  </label>
                  <p>{gap.detail}</p>
                </li>
              )
            })}
          </ul>

          <div className="devops-actions-inline">
            <button type="button" disabled={!canSeal || sealed} onClick={sealSprint}>
              Sellar sprint
            </button>
            <button type="button" className="devops-secondary" disabled={!canManageChecklist} onClick={resetSealAndApprovals}>
              Reiniciar sello
            </button>
            <button
              type="button"
              className="devops-secondary"
              disabled={!canManageChecklist}
              onClick={maybeAutoClearOneDayChecks}
            >
              Auto-limpiar checks 24h
            </button>
          </div>
          <p className="devops-muted">Pendientes para sellar: {pendingRequired.length}</p>
          <p className="devops-muted">Borrado: {canDeleteRecords ? 'desbloqueado' : 'bloqueado por validacion automatica'}</p>
          <button type="button" className="devops-secondary" onClick={validateDeleteLock}>Validar y desbloquear borrado</button>
          {deleteGuardMessage ? <p className="devops-muted">{deleteGuardMessage}</p> : null}
          {!canManageChecklist ? <p className="devops-warning">Solo owner/encargado automatizado puede check/uncheck y limpiar.</p> : null}
        </article>

        <article className="devops-card">
          <h2>Ideas / Conceptos</h2>
          <p className="devops-muted">Inbox para enviar ideas al skill market-research y generar producto validable.</p>
          <div className="devops-idea-input">
            <textarea
              value={newIdea}
              onChange={(event) => setNewIdea(event.target.value)}
              placeholder="Ejemplo: Lazo universal entre IAs para compartir contexto entre GPT, Claude y Grok"
              rows={3}
            />
            <button type="button" onClick={addIdea}>Agregar idea</button>
          </div>
          <ul className="devops-idea-list">
            {ideas.length === 0 ? <li className="devops-muted">Sin ideas registradas.</li> : null}
            {ideas.map((idea, index) => (
              <li key={`${idea}-${index}`}>
                <span>{idea}</span>
                <button type="button" className="devops-secondary" disabled={!canDeleteRecords} onClick={() => removeIdea(index)}>Quitar</button>
              </li>
            ))}
          </ul>
        </article>

        <article className="devops-card">
          <h2>Resultados que importan</h2>
          <p className="devops-muted">Senales para saber si esto se vuelve producto vendible o no.</p>
          <div className="devops-kpis">
            <div>
              <span>Leads</span>
              <strong>{dashboard.leadsToday}</strong>
            </div>
            <div>
              <span>Contenido</span>
              <strong>{dashboard.generatedContent}</strong>
            </div>
            <div>
              <span>Bots</span>
              <strong>{dashboard.activeBots}</strong>
            </div>
            <div>
              <span>Precio prom.</span>
              <strong>{dashboard.averagePrice}</strong>
            </div>
          </div>

          <div className="devops-actions-inline">
            <button type="button" onClick={refreshDiagnostics}>Refrescar metricas</button>
            <button type="button" onClick={executeActivationFlow}>Activar flujo</button>
          </div>

          <div className="devops-log">
            {logs.length === 0 ? <p className="devops-muted">Sin eventos todavia.</p> : null}
            {logs.map((line, idx) => (
              <p key={`${line}-${idx}`}>- {line}</p>
            ))}
          </div>
        </article>

        <article className="devops-card">
          <h2>Productos terminados / Aprobacion</h2>
          <p className="devops-muted">Zona de productos listos para validar y mover a produccion cuando se selle el sprint.</p>
          <ul className="devops-idea-list">
            {FINISHED_PRODUCTS.map((product) => (
              <li key={product.name}>
                <div>
                  <strong>{product.name}</strong>
                  <p className="devops-muted">Estado: {product.status}</p>
                  <p className="devops-muted">Ruta: {product.location}</p>
                  <p className="devops-muted">{product.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="devops-card">
          <h2>Cobertura de Bots</h2>
          <p className="devops-muted">Vista rapida de bots activos vs bots papel indispensables para automatizacion completa.</p>
          <div className="devops-kpis">
            <div>
              <span>Bots activos</span>
              <strong>{BOT_COVERAGE.active.length}</strong>
            </div>
            <div>
              <span>Bots papel pendientes</span>
              <strong>{BOT_COVERAGE.paperPending.length}</strong>
            </div>
          </div>
          <ul className="devops-idea-list">
            {BOT_COVERAGE.active.map((item) => (
              <li key={item}><span>Activo: {item}</span></li>
            ))}
            {BOT_COVERAGE.paperPending.map((item) => (
              <li key={item}><span>Pendiente: {item}</span></li>
            ))}
          </ul>
        </article>

        <article className="devops-card">
          <h2>Notas VMDEV + Ejecucion</h2>
          <p className="devops-muted">Notas del desarrollador y acciones del engine. Bloqueado hasta sello.</p>

          <textarea
            value={vmdevNotes}
            onChange={(event) => updateVmdevNotes(event.target.value)}
            placeholder="Notas VMDEV: decisiones, bloqueos, hallazgos, siguiente paso"
            rows={6}
          />

          <div className="devops-actions-inline">
            <button type="button" disabled={!sealed} onClick={() => runAction('product')}>
              Ejecutar producto
            </button>
            <button type="button" disabled={!sealed} onClick={() => runAction('content')}>
              Ejecutar contenido
            </button>
            <button type="button" disabled={!sealed} onClick={() => runAction('traffic')}>
              Ejecutar trafico
            </button>
          </div>

          {errorMessage ? <p className="devops-error">Error: {errorMessage}</p> : null}
          {!sealed ? <p className="devops-warning">Sella sprint para habilitar ejecucion.</p> : null}

          <div className="devops-root-entry">
            <Link to="/workspace" className="devops-root-link">Entrar al workspace raiz</Link>
          </div>
        </article>
      </section>
    </main>
  )
}
