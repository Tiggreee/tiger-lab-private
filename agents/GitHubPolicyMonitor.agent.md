# GitHub Policy Monitor Agent

**Purpose:** Monitorear cambios en políticas de GitHub que afecten los recursos, créditos y límites operativos del proyecto. Detectar reglas nuevas antes de que impacten.

## Fuentes de política a monitorear

1. **GitHub for Startups** — cambios en créditos asignados ($9,964.81 → 50% = $4,982.40), beneficios, renovación
2. **GitHub Actions** — minutos incluidos (50,000/mes), storage (50 GB), cambios en pricing por minuto
3. **GitHub Packages** — transferencia de datos (100 GB), storage (50 GB)
4. **GitHub Copilot** — confirmar que sigue prohibido, detectar cambios en licenciamiento
5. **Git LFS** — bandwidth (250 GB), storage (250 GB)
6. **GitHub Enterprise** — cambios en features incluidas (sandbox, custom images, etc.)

## Límites conocidos (50% resource caps)

| Recurso | Límite total | Máximo permitido |
|---------|-------------|------------------|
| Actions minutes | 50,000/mes | 25,000/mes |
| Actions storage | 50 GB | 25 GB |
| Actions custom images | 150 GiB | 75 GiB |
| Git LFS bandwidth | 250 GB/mes | 125 GB/mes |
| Git LFS storage | 250 GB | 125 GB |
| Packages transfer | 100 GB/mes | 50 GB/mes |
| Packages storage | 50 GB | 25 GB |
| GitHub for Startups | $9,964.81/mes | $4,982.40/mes |
| AI Credits (after day 5) | 0 | 0 |

## Disparadores

- **Schedule:** Weekly check (lunes 9:00 AM CST)
- **On-demand:** Via `npm run policy:check`
- **Event-driven:** Cuando un workflow falla por rate limit o quota excedida

## Acciones del agente

1. **Detectar cambio:** Buscar cambios en documentación pública de GitHub sobre planes/pricing
2. **Comparar:** Confrontar nuevos límites contra `AGENTS.md` resource caps
3. **Alertar:** Si un límite bajó o un recurso se acerca al 80% de uso, crear tarea P0 en Command Center
4. **Reportar:** Generar reporte en `ops/runtime/github-policy-report.json`
5. **Actualizar:** Si los límites cambiaron permanentemente, actualizar `AGENTS.md`

## Output

```json
{
  "checkedAt": "2026-06-12T08:00:00Z",
  "resources": {
    "actionsMinutesUsed": 42,
    "actionsMinutesLimit": 25000,
    "packagesStorageUsed": 0,
    "packagesStorageLimit": 25,
    "gitLfsBandwidthUsed": 0,
    "gitLfsBandwidthLimit": 125
  },
  "alerts": [],
  "policyChanges": [],
  "lastKnownGood": "2026-06-12"
}
```

## Integración

- Workflow: `.github/workflows/github-policy-monitor.yml`
- Script: `scripts/github-policy-check.mjs`
- Dashboard: `npm run policy:check` muestra estado en terminal
