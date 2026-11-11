# @monitor-sefaz/contracts

## 0.2.0

### Minor Changes

- 96c625f: Exporta o `CompactHistoryStore`, que lê e grava o histórico compacto sobre qualquer armazenamento chave → texto (a interface `TextStore`, com `get` e `put`), e as constantes `COMPACT_HISTORY_KEY`, `COMPACT_HISTORY_STEP_MS` (5 min) e `COMPACT_HISTORY_RETENTION_MS` (72 h). Antes isso vivia só dentro do Cloudflare Worker do monitor. Agora o Worker o lê pelo binding do KV, e a coleta do GitHub Actions o grava pela API REST do Cloudflare, com a mesma chave e a mesma regra de poda. Nada do que já existia muda.
- b055f90: Camada de detalhe por autorizador × ambiente × serviço: o estado de cada operação (autorização, consulta, eventos, status…) que o SVRS e a página da Receita já publicam e que o consenso reduzia a um estado só.

  - `@monitor-sefaz/contracts`: `detailSnapshotSchema`, `authorizerDetailSchema` e `operationStatusSchema`, com os tipos `DetailSnapshotDTO`, `AuthorizerDetailDTO` e `OperationStatusDTO`.
  - `@monitor-sefaz/core`:
    - `DetailCollector` monta o detalhe a partir das páginas já baixadas numa rodada (`PageLog`), mais as páginas de homologação da Receita (`HOMOLOGATION_AVAILABILITY_URLS`).
    - `ConsensusCollector.createForNode` aceita um `PageLog` opcional como terceiro argumento e grava nele as páginas do SVRS e da Receita.
    - `HttpAvailabilityProvider` ganha um gancho `onPage` opcional (quarto argumento do construtor) e o método `fetchPage`.
    - `AvailabilityParser` ganha `parseOperations`, que lê todas as colunas de serviço, com o nome do cabeçalho.
    - `recordingSvrsFetcher` guarda as páginas baixadas por um fetcher do SVRS.

- 03cc474: O histórico ganha a janela de 6h: `historyPeriodSchema` aceita `'6h'` (além de `'24h'` e `'72h'`) e `PERIOD_MS['6h']` vale 6 horas. Quem tiver um `Record<HistoryPeriod, …>` exaustivo precisa acrescentar a chave `'6h'`.
- b4cc59f: Passa a usar o zod 4 (4.6.7), que corrige a vulnerabilidade GHSA-mrhx-c7xc-m3w5 (consumo de memória ao validar coleções grandes com restrições).

  Os esquemas exportados continuam com os mesmos nomes, os mesmos campos e a mesma regra de validação: os snapshots, o histórico, o resumo e as notas técnicas são aceitos exatamente como antes. O que muda para quem consome o pacote:

  - Os esquemas agora são objetos do zod 4. Quem os compõe com código próprio em zod 3 (`.extend`, `z.union` e afins) precisa atualizar para o zod 4. Quem só chama `.parse`/`.safeParse` ou usa os tipos `*DTO` não precisa mudar nada.
  - Os códigos de erro seguem o zod 4: um valor fora de um enum vem como `invalid_value`, em vez de `invalid_enum_value`.

### Patch Changes

- 017a27f: A cobertura de cada fonte do consenso passa a ser medida só sobre os documentos que ela publica.

  - `@monitor-sefaz/core`: `StatusCollectorLike` ganha o método opcional `supportedDocuments()`. O `SvrsCollector`, o `AvailabilityCollector` (que conta MDF-e e DC-e, derivados do SVRS) e o `IntegraNotasCollector` passam a implementá-lo. Em `collectWithDiagnostics`, o `expected` de cada fonte vira o número de serviços do catálogo nesses documentos, e o `degraded` usa esse número. Antes, todo `expected` era o catálogo inteiro, e um documento que só parte das fontes publica empurrava as outras para baixo do piso. Um coletor próprio que não implemente o método continua medido sobre o catálogo inteiro, como antes.
  - `@monitor-sefaz/contracts`: a documentação de `SourceHealthDTO.expected` passa a descrever o novo significado. O formato do campo não muda.

- Updated dependencies [e7b12b3]
- Updated dependencies [66c5890]
  - @monitor-sefaz/catalog@0.4.0

## 0.1.2

### Patch Changes

- ad2d116: README: a estimativa do histórico compacto agora considera os 162 serviços do catálogo (6 documentos × 27 UFs), cerca de 275 KB para 72h.
- Updated dependencies [ced8f08]
  - @monitor-sefaz/catalog@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies [e0a6aae]
  - @monitor-sefaz/catalog@0.2.0
