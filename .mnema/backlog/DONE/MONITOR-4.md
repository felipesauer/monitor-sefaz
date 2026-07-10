---
mnema:
  key: MONITOR-4
  state: DONE
  title: Detecção de drift + sinal de saúde da coleta (item 1, núcleo)
  description: >-
    No ConsensusCollector, computar cobertura efetiva por fonte vs. o esperado
    do Catalog e um flag degraded quando cai abaixo do piso. Expor no
    summary.json (sources: [{source, official, collected, expected, coverage,
    degraded}]). Parte observável PRONTA. O evento SOURCE_DEGRADED (alerta)
    depende do Notifier (Fases 1-3) e fica pendente.
  acceptance_criteria:
    - cobertura por fonte + flag degraded no summary.json
    - >-
      SOURCE_DEGRADED disparado quando fonte oficial degrada entre coletas
      (pendente: depende do Notifier)
    - fonte oficial abaixo do piso produz degraded=true
  labels:
    - core
    - fase-8
    - observabilidade
  estimate: 3
  priority: 3
  assignee: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  reporter: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  epic_key: MONITOR-EPIC-2
  sprint_key: null
  reopen_count: 0
  metadata: {}
  updated_at: '2026-07-10T14:28:31.060Z'
---
# Detecção de drift + sinal de saúde da coleta (item 1, núcleo)
