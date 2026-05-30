import type { AsyncStatus } from '../controllers/AutonomousSystemController'
import '../styles/dashboard.css'

function KpiBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="dashboard-kpi" role="listitem" aria-label={label}>
      <p className="dashboard-kpi-label">{label}</p>
      <p className="dashboard-kpi-value">{value}</p>
    </article>
  )
}

function SystemBadge({ status }: { status: AsyncStatus }) {
  const className = `dashboard-badge dashboard-badge-${status}`

  return (
    <span className={className}>
      Estado: {status}
    </span>
  )
}

function Stage({ label, active }: { label: string; active: boolean }) {
  return (
    <li className={active ? 'dashboard-stage dashboard-stage-active' : 'dashboard-stage'}>
      <span className="dashboard-stage-dot" aria-hidden="true" />
      <span>{label}</span>
    </li>
  )
}

function FunnelPreview({ isLoading }: { isLoading: boolean }) {
  const activeStep = isLoading ? 2 : 4

  return (
    <ol className="dashboard-funnel" aria-label="Flujo principal de conversion">
      <Stage label="Visit" active={activeStep >= 1} />
      <Stage label="Lead" active={activeStep >= 2} />
      <Stage label="Trial" active={activeStep >= 3} />
      <Stage label="Checkout" active={activeStep >= 4} />
      <Stage label="Paid" active={activeStep >= 5} />
    </ol>
  )
}

function HealthSummary({ status }: { status: AsyncStatus }) {
  const messageByStatus: Record<AsyncStatus, string> = {
    idle: 'Listo para activar monetizacion y abrir checkout.',
    loading: 'Ejecutando flujo de activacion y sincronizacion de pipelines.',
    success: 'Pipeline operativo y checkout habilitado para conversion.',
    error: 'Se detecto una falla en el flujo. Revisa logs y reintenta.'
  }

  return (
    <p className="dashboard-health" role="status">
      {messageByStatus[status]}
    </p>
  )
}

function KpiGrid({ metrics }: { metrics?: DashboardProps['metrics'] }) {
  return (
    <section className="dashboard-kpi-grid" role="list" aria-label="Indicadores principales">
      <KpiBlock label="Leads hoy" value={metrics?.leadsToday ?? 0} />
      <KpiBlock label="Contenido generado" value={metrics?.generatedContent ?? 0} />
      <KpiBlock label="Bots activos" value={metrics?.activeBots ?? 1} />
      <KpiBlock label="Precio promedio" value={metrics?.averagePrice ?? '$0.00'} />
    </section>
  )
}

function Header({ status }: { status: AsyncStatus }) {
  return (
    <header className="dashboard-header">
      <div>
        <p className="dashboard-overline">Command Center</p>
        <h1 className="dashboard-title">Dashboard de monetizacion</h1>
      </div>
      <SystemBadge status={status} />
    </header>
  )
}

function ActionSection({ isLoading, onActivateMonetization }: { isLoading: boolean; onActivateMonetization?: () => void }) {
  return (
    <section className="dashboard-action">
      <button
        className="dashboard-activate-button"
        disabled={isLoading}
        onClick={onActivateMonetization}
        type="button"
      >
        {isLoading ? 'Activando...' : 'Activar monetizacion'}
      </button>
      <p className="dashboard-action-note">Despues de activar, la app navega automaticamente al checkout.</p>
    </section>
  )
}

export interface DashboardProps {
  readonly status?: AsyncStatus
  readonly metrics?: {
    readonly leadsToday?: number
    readonly generatedContent?: number
    readonly activeBots?: number
    readonly averagePrice?: string
  }
  readonly onActivateMonetization?: () => void
}

export default function Dashboard({ status = 'idle', metrics, onActivateMonetization }: DashboardProps) {
  const isLoading = status === 'loading'

  return (
    <main className="dashboard-page" aria-label="Dashboard operativo">
      <div className="dashboard-shell">
        <Header status={status} />
        <HealthSummary status={status} />
        <KpiGrid metrics={metrics} />
        <FunnelPreview isLoading={isLoading} />
        <ActionSection isLoading={isLoading} onActivateMonetization={onActivateMonetization} />
      </div>
    </main>
  )
}
