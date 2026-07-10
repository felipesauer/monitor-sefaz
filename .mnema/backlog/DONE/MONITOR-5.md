---
mnema:
  key: MONITOR-5
  state: DONE
  title: Parser defensivo a mudança de layout (item 4)
  description: >-
    AvailabilityParser resolvia a coluna por índice fixo (já quebrou com CTe).
    Agora resolve os índices de "Status Serviço"/"Tempo Médio" pelo TEXTO do
    cabeçalho (âncoras ASCII "status"/"tempo", robustas ao mojibake latin-1),
    com o índice fixo como fallback. Novo parseWithDiagnostics() retorna { rows,
    headerMatched }: headerMatched=false com página não-vazia sinaliza possível
    drift. parse() delega e é retrocompatível. PENDENTE: propagar headerMatched
    pela cadeia
    AvailabilityProviderLike→AvailabilityCollector→ConsensusCollector para que a
    Receita entre como degraded quando o layout não casar (integra com
    MONITOR-4).
  acceptance_criteria:
    - >-
      índice de coluna descoberto pelo texto do cabeçalho, fallback ao índice
      fixo
    - >-
      fixture com coluna deslocada: detecta pelo cabeçalho (marca degraded via
      headerMatched pendente de propagação)
    - 0 linhas / sem cabeçalho vira sinal headerMatched=false (drift)
  labels:
    - core
    - fase-8
    - parser
  estimate: 3
  priority: 3
  assignee: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  reporter: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  epic_key: MONITOR-EPIC-2
  sprint_key: null
  reopen_count: 0
  metadata: {}
  updated_at: '2026-07-10T14:27:48.870Z'
---
# Parser defensivo a mudança de layout (item 4)
