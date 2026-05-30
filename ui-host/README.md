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

## Publicacion en GitHub Pages

- Workflow: .github/workflows/ui-host-pages.yml
- URL objetivo: https://tiggreee.github.io/tiger-lab-private/
- Dashboard directo: https://tiggreee.github.io/tiger-lab-private/#/dashboard

Notas tecnicas:

- En produccion se usa HashRouter para evitar 404 en refresh de rutas.
- El build usa base relativa para que los assets funcionen en rutas de Pages.
