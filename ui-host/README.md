# UI Host Dashboard

Frontend React + TypeScript para el panel operativo de monetizacion.

## Comandos

```bash
npm ci
npm run dev
```

Build local:

```bash
npm run build
npm run preview
```

## Rutas principales

- / (landing)
- /onboarding
- /dashboard
- /checkout
- /automation

## Monolith Gateway (tigrelabs.xyz)

- Entry page: / (registro de visita en localStorage y beacon opcional a /api/track/visit)
- Redirecciones por subdominio (cuando aplique):
	- factura.tigrelabs.xyz -> /onboarding?product=facturaautentica
	- money.tigrelabs.xyz -> /onboarding?product=all-about-money
	- cloud.tigrelabs.xyz -> /onboarding?product=facturautentico-cloud
	- kit.tigrelabs.xyz -> /onboarding?product=script-premium-kit

Notas:

- En build de produccion se transforma el target a hash route para compatibilidad de hosting estatico.
- El redirect es rapido y sin pasos manuales para el visitante.

## Publicacion en GitHub Pages

- Workflow: .github/workflows/ui-host-pages.yml
- URL objetivo: https://tiggreee.github.io/tiger-lab-private/
- Dashboard directo: https://tiggreee.github.io/tiger-lab-private/#/dashboard

Notas tecnicas:

- En produccion se usa HashRouter para evitar 404 en refresh de rutas.
- El build usa base relativa para que los assets funcionen en rutas de Pages.
