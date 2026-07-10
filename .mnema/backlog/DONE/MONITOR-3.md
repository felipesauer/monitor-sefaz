---
mnema:
  key: MONITOR-3
  state: DONE
  title: Paridade Node↔Worker no WorkerAvailabilityProvider (item 3)
  description: >-
    O Worker da Receita divergia do Node: usava .text() (assume UTF-8) sem
    forçar latin-1, e não tinha backoff entre tentativas. Alinhar:
    TextDecoder('latin1') + backoff compartilhado, com sleep/random injetáveis.
    Adicionado apps/worker ao vitest.workspace + vitest.config.ts do worker.
  acceptance_criteria:
    - decodifica via TextDecoder('latin1') como o SVRS do Worker
    - backoff entre tentativas (paridade com o Node)
    - >-
      teste de paridade: mesmo HTML de fixture → mesmo resultado Worker e
      collector
  labels:
    - fase-8
    - paridade
    - worker
  estimate: 1
  priority: 2
  assignee: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  reporter: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  epic_key: MONITOR-EPIC-2
  sprint_key: null
  reopen_count: 0
  metadata: {}
  updated_at: '2026-07-10T14:27:46.199Z'
---
# Paridade Node↔Worker no WorkerAvailabilityProvider (item 3)
