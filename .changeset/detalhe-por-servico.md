---
'@monitor-sefaz/contracts': minor
'@monitor-sefaz/core': minor
---

Camada de detalhe por autorizador × ambiente × serviço: o estado de cada operação (autorização, consulta, eventos, status…) que o SVRS e a página da Receita já publicam e que o consenso reduzia a um estado só.

- `@monitor-sefaz/contracts`: `detailSnapshotSchema`, `authorizerDetailSchema` e `operationStatusSchema`, com os tipos `DetailSnapshotDTO`, `AuthorizerDetailDTO` e `OperationStatusDTO`.
- `@monitor-sefaz/core`:
  - `DetailCollector` monta o detalhe a partir das páginas já baixadas numa rodada (`PageLog`), mais as páginas de homologação da Receita (`HOMOLOGATION_AVAILABILITY_URLS`).
  - `ConsensusCollector.createForNode` aceita um `PageLog` opcional como terceiro argumento e grava nele as páginas do SVRS e da Receita.
  - `HttpAvailabilityProvider` ganha um gancho `onPage` opcional (quarto argumento do construtor) e o método `fetchPage`.
  - `AvailabilityParser` ganha `parseOperations`, que lê todas as colunas de serviço, com o nome do cabeçalho.
  - `recordingSvrsFetcher` guarda as páginas baixadas por um fetcher do SVRS.
