---
mnema:
  key: MONITOR-12
  state: DONE
  title: 'Fase 6: coleta de Notas Técnicas + evento TECHNICAL_NOTE'
  description: >-
    core/technical-notes (parser puro, provider com retry, fetcher latin-1).
    Extrai TODAS as notas e persiste o link. contracts: technicalNote schemas.
    collector: coleta tolerante a falha, reconcilia technical-notes.json (dedup
    preservando firstSeenAt), emite TECHNICAL_NOTE por NT inédita.
  acceptance_criteria:
    - parser extrai TODAS as notas e persiste o link (fixture latin-1)
    - provider com retry; lança se vazio após tentativas
    - 'dedup entre execuções via technical-notes.json (E2E: 3 novas → 0 → 1)'
    - coleta de NT tolerante a falha (não derruba status); emite TECHNICAL_NOTE
  labels:
    - collector
    - core
    - fase-6
    - notifier
    - technical-notes
  estimate: 3
  priority: 3
  assignee: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  reporter: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  epic_key: MONITOR-EPIC-3
  sprint_key: null
  reopen_count: 0
  metadata: {}
  updated_at: '2026-07-10T14:28:46.751Z'
---
# Fase 6: coleta de Notas Técnicas + evento TECHNICAL_NOTE
