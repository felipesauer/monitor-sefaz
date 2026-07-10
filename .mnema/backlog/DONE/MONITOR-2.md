---
mnema:
  key: MONITOR-2
  state: DONE
  title: Retry+backoff no IntegraNotasProvider (item 2)
  description: >-
    IntegraNotas é a única fonte que cobre UF-a-UF de forma completa e não tinha
    retry — uma falha transitória deixava várias UFs sem dado. Adicionar
    attempts=3 com backoff, injetando sleep/random, mantendo parse estrito
    (lança no fim). Vale para Node e Worker (mesmo provider).
  acceptance_criteria:
    - fetch aceita attempts (default 3) com backoff entre tentativas
    - 'parse estrito preservado: lança após esgotar tentativas'
    - sleep/random injetáveis para teste determinístico
    - 'teste: fetcher que falha 1x tem sucesso no retry'
  labels:
    - core
    - fase-8
    - resiliencia
  estimate: 1
  priority: 2
  assignee: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  reporter: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  epic_key: MONITOR-EPIC-2
  sprint_key: null
  reopen_count: 0
  metadata: {}
  updated_at: '2026-07-10T14:27:43.836Z'
---
# Retry+backoff no IntegraNotasProvider (item 2)
