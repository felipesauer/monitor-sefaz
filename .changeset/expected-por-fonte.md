---
'@monitor-sefaz/core': minor
'@monitor-sefaz/contracts': patch
---

A cobertura de cada fonte do consenso passa a ser medida só sobre os documentos que ela publica.

- `@monitor-sefaz/core`: `StatusCollectorLike` ganha o método opcional `supportedDocuments()`. O `SvrsCollector`, o `AvailabilityCollector` (que conta MDF-e e DC-e, derivados do SVRS) e o `IntegraNotasCollector` passam a implementá-lo. Em `collectWithDiagnostics`, o `expected` de cada fonte vira o número de serviços do catálogo nesses documentos, e o `degraded` usa esse número. Antes, todo `expected` era o catálogo inteiro, e um documento que só parte das fontes publica empurrava as outras para baixo do piso. Um coletor próprio que não implemente o método continua medido sobre o catálogo inteiro, como antes.
- `@monitor-sefaz/contracts`: a documentação de `SourceHealthDTO.expected` passa a descrever o novo significado. O formato do campo não muda.
