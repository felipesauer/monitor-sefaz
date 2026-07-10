---
mnema:
  key: MONITOR-9
  state: DONE
  title: 'Fase 3: config por env + Notifier (orquestrador)'
  description: >-
    parseNotifierConfig(env) ativa canais só com vars presentes
    (Discord/Slack/Telegram exige token+chat/webhook) e lê NOTIFY_EVENTS como
    filtro. Notifier.notify(events) faz fan-out eventos×canais via
    Promise.allSettled — falha de um canal não derruba os outros. Sem canais =
    no-op. Vars documentadas no .env.example.
  acceptance_criteria:
    - parseNotifierConfig só ativa canais com vars presentes
    - Notifier.notify filtra por NOTIFY_EVENTS e faz fan-out allSettled
    - 'sem nenhuma var: lista vazia e notify() no-op (testado)'
    - vars documentadas no .env.example
  labels:
    - config
    - fase-3
    - notifier
  estimate: 2
  priority: 2
  assignee: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  reporter: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  epic_key: MONITOR-EPIC-3
  sprint_key: null
  reopen_count: 0
  metadata: {}
  updated_at: '2026-07-10T14:28:39.025Z'
---
# Fase 3: config por env + Notifier (orquestrador)
