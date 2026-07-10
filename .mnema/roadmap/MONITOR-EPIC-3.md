---
mnema:
  key: MONITOR-EPIC-3
  kind: epic
  state: CLOSED
  title: Notificações externas (webhooks por evento)
  description: >-
    Sistema de notificação para avisar quando serviços caem/voltam, entram/saem
    de contingência, sai Nota Técnica nova, ou por resumo diário — hoje o
    monitor só mostra estado no dashboard. Pacote packages/notifier: detecção de
    transições pura (reusa isUp), canais Discord/Slack/Telegram/webhook genérico
    com formatters desacoplados + timeout/retry/allSettled, config por env
    (no-op sem env), plugado no collector (Actions) e no Scheduler (API).
    Destrava o alerta SOURCE_DEGRADED da Fase 8. Plano completo no arquivo de
    plano local (Fases 1-7).
  metadata: {}
  created_at: '2026-07-10T00:20:36.112Z'
  closed_at: '2026-07-10T14:29:14.518Z'
---
# Notificações externas (webhooks por evento)
