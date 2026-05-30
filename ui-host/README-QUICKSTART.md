# UI Host (React/Vite) – Quickstart

Este host monta la UI moderna con rutas, estado global y callbacks funcionales.

## Uso rápido

1. Instala dependencias:

```bash
cd ui-host
npm install
```

2. Levanta el servidor de desarrollo:

```bash
npm run dev
```

3. Abre en tu navegador:

http://localhost:5173

## Flujo de navegación
- `/` → Landing
- `/onboarding` → Formulario de onboarding
- `/dashboard` → Dashboard de métricas
- `/checkout` → Checkout simulado
- `/automation` → Panel de automatización y log

## ¿Qué está cableado?
- Todos los componentes UI modernos (Landing, Onboarding, Dashboard, Checkout, AutomationPanel)
- Estado global con Zustand
- Controlador simulado (browser-safe) para callbacks y estados

## ¿Cómo conecto el runtime real?
- Cambia el import en `src/controllers/AutonomousSystemController.ts` para usar el controlador real del repo principal.
- Resuelve dependencias Node/FS si quieres full backend en browser (requiere más trabajo, por defecto el host usa un mock seguro para navegador).

## Extensión
- Puedes reemplazar los componentes en `src/components/` por los del repo principal si resuelves dependencias de backend.
- El flujo y los props ya están tipados y listos para integración real.

---

Cualquier duda, revisa el archivo HOST_REACT_VITE.txt en la raíz del repo para la estructura recomendada.
