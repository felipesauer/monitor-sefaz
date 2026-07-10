---
mnema:
  key: MONITOR-1
  state: DONE
  title: Extrair backoff/Sleeper para util compartilhado do core
  description: >-
    backoffMs/Sleeper viviam em AvailabilityProvider e o SvrsProvider importava
    de lá (acoplamento). Extrair para packages/core/src/domain/retry.ts e
    reexportar no index do core. Base para o retry do IntegraNotas.
  acceptance_criteria:
    - retry.ts criado com backoffMs, Sleeper e defaultSleeper
    - AvailabilityProvider e SvrsProvider importam do novo util
    - >-
      backoffMs reexportado por AvailabilityProvider (compat) e pelo index do
      core
    - testes de backoff seguem verdes
  labels:
    - core
    - fase-8
    - refactor
  estimate: 1
  priority: 2
  assignee: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  reporter: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  epic_key: MONITOR-EPIC-2
  sprint_key: null
  reopen_count: 0
  metadata: {}
  updated_at: '2026-07-10T14:27:41.218Z'
---
# Extrair backoff/Sleeper para util compartilhado do core
