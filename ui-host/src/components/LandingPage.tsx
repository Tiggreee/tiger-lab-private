import type { AsyncStatus } from '../controllers/AutonomousSystemController'

interface LandingPageProps {
  readonly onStart?: () => void
  readonly status?: AsyncStatus
  readonly activeRouteLabel?: string
}

const expansionTracks = [
  {
    name: 'all-about-money',
    role: 'Expansion comercial',
    detail: 'Operacion financiera y crecimiento con trazabilidad tecnica.'
  },
  {
    name: 'FacturAutentico Cloud',
    role: 'Expansion tecnica',
    detail: 'Oferta cloud con planes listos para escalar conversion.'
  },
  {
    name: 'Script Premium Kit',
    role: 'Expansion operativa',
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
        <h1 id="gateway-title">FacturaAutentica: convertir y cobrar con menos friccion operativa.</h1>
        <p className="gateway-subtitle">
          Flujo principal enfocado en FacturaAutentica para despachos y operaciones SMB en Mexico.
          Objetivo: cerrar mas rapido, cobrar mejor y ejecutar onboarding sin friccion.
        </p>

        <div className="gateway-actions">
          <button className="gateway-button-primary" disabled={isLoading} onClick={onStart} type="button">
            {isLoading ? 'Activando...' : 'Iniciar FacturaAutentica'}
          </button>
          <a className="gateway-button-ghost" href="#launch-grid">
            Ver tracks secundarios
          </a>
        </div>

        <p className="gateway-focus-tag">Foco actual: FacturaAutentica-first</p>
        <p className="gateway-route-tag">Ruta activa: {activeRouteLabel}</p>
      </section>

      <section id="launch-grid" className="gateway-grid" aria-label="Launch products">
        <article className="gateway-card gateway-card-primary">
          <p className="gateway-card-role">Producto activo</p>
          <h2>FacturaAutentica</h2>
          <p>Facturacion CFDI simplificada para negocio real en Mexico.</p>
        </article>
      </section>

      <section className="gateway-grid" aria-label="Expansion tracks">
        <p className="gateway-grid-title">Tracks en expansion (no foco del milestone)</p>
        {expansionTracks.map((product) => (
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
