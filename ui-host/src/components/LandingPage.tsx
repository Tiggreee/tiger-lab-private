import type { AsyncStatus } from '../controllers/AutonomousSystemController'

interface LandingPageProps {
  readonly onStart?: () => void
  readonly status?: AsyncStatus
  readonly activeRouteLabel?: string
}

const launchProducts = [
  {
    name: 'FacturaAutentica',
    role: 'Producto propio refinado',
    detail: 'Facturacion CFDI simplificada para negocio real en Mexico.'
  },
  {
    name: 'all-about-money',
    role: 'Producto propio probado',
    detail: 'Operacion financiera y crecimiento con trazabilidad tecnica.'
  },
  {
    name: 'FacturAutentico Cloud',
    role: 'Motor CLI probado',
    detail: 'Oferta cloud con planes listos para escalar conversion.'
  },
  {
    name: 'Script Premium Kit',
    role: 'Motor CLI modernista',
    detail: 'Automatizaciones premium orientadas a velocidad de ejecucion.'
  }
]

export default function LandingPage({ onStart, status = 'idle', activeRouteLabel = 'root' }: LandingPageProps) {
  const isLoading = status === 'loading'
  const currentHost = typeof window !== 'undefined' ? window.location.host : 'railway-host'

  return (
    <main className="gateway-page" aria-label="TigreLabs entry page">
      <section className="gateway-hero" aria-labelledby="gateway-title">
        <p className="gateway-kicker">TigreLabs Organization Gateway</p>
        <h1 id="gateway-title">Productos reales para negocios que no tienen tiempo para perder.</h1>
        <p className="gateway-subtitle">
          Interfaz clara, automatizacion fuerte y ejecucion confiable. Diseñado para que una persona adulta
          pueda entrar, entender y facturar sin friccion mental.
        </p>

        <div className="gateway-actions">
          <button className="gateway-button-primary" disabled={isLoading} onClick={onStart} type="button">
            {isLoading ? 'Activando...' : 'Entrar al flujo'}
          </button>
          <a className="gateway-button-ghost" href="#launch-grid">
            Ver cartera Fantastic 4
          </a>
        </div>

        <p className="gateway-route-tag">Ruta activa: {activeRouteLabel}</p>
      </section>

      <section id="launch-grid" className="gateway-grid" aria-label="Launch products">
        {launchProducts.map((product) => (
          <article key={product.name} className="gateway-card">
            <p className="gateway-card-role">{product.role}</p>
            <h2>{product.name}</h2>
            <p>{product.detail}</p>
          </article>
        ))}
      </section>

      <footer className="gateway-footer">
        <p>{currentHost} · Monolith entry running</p>
      </footer>
    </main>
  )
}
