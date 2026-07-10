---
mnema:
  key: MONITOR-15
  state: DONE
  title: 'Refinamentos pós-auditoria: digest idempotente + card de NTs no dashboard'
  description: >-
    (1) digest idempotente por dia via notifier-state.json. (2) sumiço
    documentado como design. (3) card de Notas Técnicas no dashboard (3
    DataSources + hook + componente colapsável).
  acceptance_criteria:
    - 'digest não duplica nem pula (E2E: 2 coletas/dia = 1 digest)'
    - sumiço documentado como design em diff.ts
    - >-
      card de NTs renderiza (link vs texto, colapso, vazio não-renderiza) — 4
      testes
    - getTechnicalNotes tolerante nas 3 fontes; build web verde
  labels:
    - notifier
    - refinamento
    - web
  estimate: 3
  priority: 3
  assignee: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  reporter: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  epic_key: MONITOR-EPIC-3
  sprint_key: null
  reopen_count: 0
  metadata: {}
  updated_at: '2026-07-10T14:27:54.656Z'
---
# Refinamentos pós-auditoria: digest idempotente + card de NTs no dashboard
