---
mnema:
  key: MONITOR-11
  state: DONE
  title: 'Fase 5: plugar Notifier no Scheduler (API)'
  description: >-
    Scheduler recebe Notifier opcional; reconstrói prev do lastState e reusa
    detectTransitions (mesma semântica do collector) para notificar em tempo
    quase real. Só com mudança e canais ativos; no-op caso contrário. server
    monta via parseNotifierConfig e injeta.
  acceptance_criteria:
    - Scheduler injeta Notifier opcional e reusa detectTransitions
    - notifica na transição, não no baseline (testado)
    - no-op quando Notifier desabilitado (testado)
    - server monta e injeta o Notifier
  labels:
    - api
    - fase-5
    - notifier
  estimate: 2
  priority: 2
  assignee: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  reporter: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  epic_key: MONITOR-EPIC-3
  sprint_key: null
  reopen_count: 0
  metadata: {}
  updated_at: '2026-07-10T14:28:43.535Z'
---
# Fase 5: plugar Notifier no Scheduler (API)
