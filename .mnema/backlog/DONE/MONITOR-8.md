---
mnema:
  key: MONITOR-8
  state: DONE
  title: 'Fase 2: canais + formatters (Discord/Slack/Telegram/webhook)'
  description: >-
    Interface Channel { send(event) }. Formatters puros por canal (Discord embed
    cor por severidade, Slack attachment hex, Telegram markdown, webhook =
    evento cru), aparência centralizada em format/labels.ts. Entrega robusta em
    postJson: timeout + 1 retry com backoff, fetch/sleep injetáveis; lança se
    ambas falharem (allSettled fica no Notifier da Fase 3).
  acceptance_criteria:
    - 4 canais implementando Channel com fetcher injetável
    - formatters puros testados por tipo de evento
    - timeout + 1 retry; nenhum segredo hardcoded
    - falha de um canal não derruba os demais (allSettled na Fase 3)
  labels:
    - fase-2
    - notifier
  estimate: 3
  priority: 2
  assignee: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  reporter: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  epic_key: MONITOR-EPIC-3
  sprint_key: null
  reopen_count: 0
  metadata: {}
  updated_at: '2026-07-10T14:28:36.016Z'
---
# Fase 2: canais + formatters (Discord/Slack/Telegram/webhook)
