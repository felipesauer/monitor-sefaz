---
mnema:
  key: MONITOR-6
  state: DONE
  title: Guard de drift ao vivo em CI (item 5, opcional)
  description: >-
    Workflow non-blocking e separado (cron 1x/dia + dispatch) que faz 1 coleta
    ao vivo por fonte via drift-check (reusa collectWithDiagnostics) e alerta
    quando fonte oficial cai abaixo do piso — pega o drift de HTML que as
    fixtures estáticas não pegam. evaluateDrift (pura) decide; continue-on-error
    + ::warning:: sinalizam sem bloquear coleta/deploy.
  acceptance_criteria:
    - workflow separado, non-blocking, com 1 fetch ao vivo por fonte
    - alerta quando cobertura < piso (fonte oficial degradada)
    - não bloqueia o pipeline de coleta/deploy
  labels:
    - ci
    - fase-8
    - opcional
  estimate: 2
  priority: 4
  assignee: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  reporter: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  epic_key: MONITOR-EPIC-2
  sprint_key: null
  reopen_count: 0
  metadata: {}
  updated_at: '2026-07-10T14:59:40.461Z'
---
# Guard de drift ao vivo em CI (item 5, opcional)
