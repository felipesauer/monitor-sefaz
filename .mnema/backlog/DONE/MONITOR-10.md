---
mnema:
  key: MONITOR-10
  state: DONE
  title: 'Fase 4: plugar Notifier no collector (Actions)'
  description: >-
    No caminho sem servidor, reconstruir prev do history.json (último ponto por
    série), detectar transições e emitir SOURCE_DEGRADED para fontes oficiais
    degradadas; entregar aos canais depois da guarda de piso e da escrita dos
    JSONs. No-op sem NOTIFY_*. Módulo apps/collector/src/notifyEvents.ts.
    Verificado E2E com webhook local.
  acceptance_criteria:
    - prev reconstruído do último ponto de cada série do history.json
    - SOURCE_DEGRADED emitido para fontes oficiais degradadas
    - notificação roda após guarda de piso e escrita; no-op sem env
    - >-
      E2E: collector real dispara SERVICE_RECOVERED + SOURCE_DEGRADED a um
      webhook
  labels:
    - collector
    - fase-4
    - notifier
  estimate: 2
  priority: 2
  assignee: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  reporter: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  epic_key: MONITOR-EPIC-3
  sprint_key: null
  reopen_count: 0
  metadata: {}
  updated_at: '2026-07-10T14:28:40.995Z'
---
# Fase 4: plugar Notifier no collector (Actions)
