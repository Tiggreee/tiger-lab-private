# Git Rule Practica (Tiger-Lab)

Objetivo: mantener velocidad en desarrollo sin perder control comercial.

## Modo operativo

1. Flujo diario de desarrollo
- Trabaja en rama `feat/*`.
- Abre Pull Request a `main`.
- Usa merge normal cuando checks basicos pasen.

2. Hotfix urgente
- Trabaja en rama `hotfix/*`.
- Solo para incidentes que bloquean ventas, cobro o operacion critica.
- Ideal: PR rapido a `main` con contexto de impacto.

3. Cierre semanal / release
- Todo entra por PR.
- Ejecuta checks semanales antes del merge.
- Documenta cambios y riesgos en el PR.

## Scripts oficiales

Crear rama de feature:

```bash
bash scripts/git/start-feature.sh mejorar-funnel-cierre
```

Crear rama de hotfix:

```bash
bash scripts/git/start-hotfix.sh fix-payment-timeout
```

Checklist semanal:

```bash
bash scripts/git/weekly-release-check.sh
```

## Politica de decision rapida

- Si es exploracion interna: `feat/*` + PR recomendado.
- Si toca monetizacion o clientes reales: PR obligatorio.
- Si rompe produccion: `hotfix/*` inmediato + PR de trazabilidad.

## Definicion de "impacto comercial"

- Checkout, pago, provisionamiento, integraciones de contenido.
- Captura o scoring de leads.
- Publicacion automatizada que puede dañar marca.
- Cualquier cambio que afecte conversion, ingresos o cumplimiento.
