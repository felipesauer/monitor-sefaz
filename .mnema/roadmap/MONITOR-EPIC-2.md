---
mnema:
  key: MONITOR-EPIC-2
  kind: epic
  state: CLOSED
  title: Fase 8 — Endurecimento do scraping (contra drift silencioso do portal)
  description: >-
    Endurecer as fragilidades da coleta que a auditoria de robustez encontrou,
    cujo risco maior é a quebra SILENCIOSA quando a Receita/SVRS mudam o HTML
    das páginas de disponibilidade. Núcleo: distinguir "fonte oficial ficou
    inconsistente" de "serviço está down" e torná-lo observável/notificável
    (evento SOURCE_DEGRADED). Itens: util de retry compartilhado, retry no
    IntegraNotas, paridade Node↔Worker (latin-1 + backoff), detecção de drift no
    ConsensusCollector, parser defensivo por cabeçalho, e guard de drift ao vivo
    em CI. Plano completo no arquivo de plano local (Fase 8).
  metadata: {}
  created_at: '2026-07-09T23:53:44.763Z'
  closed_at: '2026-07-10T14:59:59.271Z'
---
# Fase 8 — Endurecimento do scraping (contra drift silencioso do portal)
