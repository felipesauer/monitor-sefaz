---
mnema:
  key: MONITOR-13
  state: DONE
  title: 'Fase 7: resumo diário (DAILY_DIGEST)'
  description: >-
    digest.ts: buildDigestEvent monta DAILY_DIGEST do summary; parseDigestHour
    lê NOTIFY_DIGEST_HOUR (0-23). Gatilho sem estado: emite quando hora UTC ==
    alvo. Vazio = desligado. Documentado no .env.example.
  acceptance_criteria:
    - buildDigestEvent emite só na hora-alvo; null fora dela ou desligado
    - parseDigestHour valida 0-23; vazio/inválido = null
    - payload traz disponibilidade + fontes degradadas
    - 'E2E: collector real envia DAILY_DIGEST na hora-alvo'
  labels:
    - collector
    - fase-7
    - notifier
  estimate: 1
  priority: 3
  assignee: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  reporter: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  epic_key: MONITOR-EPIC-3
  sprint_key: null
  reopen_count: 0
  metadata: {}
  updated_at: '2026-07-10T14:28:49.909Z'
---
# Fase 7: resumo diário (DAILY_DIGEST)
