---
mnema:
  key: MONITOR-7
  state: DONE
  title: 'Fase 1: schema de evento + detectTransitions (pura)'
  description: >-
    notificationEventTypeSchema (SERVICE_DOWN/RECOVERED,
    CONTINGENCY_ENTERED/EXITED, TECHNICAL_NOTE, DAILY_DIGEST, SOURCE_DEGRADED) +
    notificationEventSchema em contracts. Pacote packages/notifier com
    detectTransitions(prev,next,occurredAt): função pura reusando isUp; baseline
    sem prev = sem evento; DOWN/RECOVERED por isUp e CONTINGENCY_* por estado,
    ortogonais (DOWN→CONTINGENCY gera 2 eventos). Testável sem rede.
  acceptance_criteria:
    - schemas de evento em contracts, reexportados
    - detectTransitions pura reusa isUp; baseline não gera evento
    - DOWN/RECOVERED e CONTINGENCY_ENTERED/EXITED corretos e independentes
    - testes cobrindo baseline, cada transição e não-evento
  labels:
    - contracts
    - fase-1
    - notifier
  estimate: 2
  priority: 2
  assignee: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  reporter: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  epic_key: MONITOR-EPIC-3
  sprint_key: null
  reopen_count: 0
  metadata: {}
  updated_at: '2026-07-10T14:28:33.412Z'
---
# Fase 1: schema de evento + detectTransitions (pura)
