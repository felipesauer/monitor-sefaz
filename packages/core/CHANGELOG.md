# @monitor-sefaz/core

## 0.5.0

### Minor Changes

- a01f4cc: A latência das fontes passa a ser medida com a conexão já aberta, e reflete o tempo de resposta da página, não o de abrir a conexão até ela. Antes, o cliente HTTP dos portais (`axios-cookiejar-support`) criava um agente novo a cada requisição, e cada busca pagava DNS, TCP e TLS de novo. Num runner fora do Brasil isso dava ~2,5 s para a página da Receita, que responde em ~0,1 s com a conexão aberta.

  - Novo `createPortalClient` (interno): cookie jar com `http-cookie-agent` e `keepAlive`, usado pela disponibilidade, pelo SVRS e pelas Notas Técnicas. A dependência `axios-cookiejar-support` sai do `core`.
  - `AvailabilityProviderLike.warmUp?(document)` e `IntegraNotasFetcher.warmUp?(url)`, opcionais: abrem a conexão com um `HEAD` antes da busca cronometrada. `HttpAvailabilityProvider` e `createHttpIntegraNotasFetcher` já os implementam; providers próprios sem eles continuam funcionando, com a medida incluindo a conexão.
  - Quem guarda histórico de `latencyMs` vai ver os valores caírem a partir desta versão: é a mudança de medida, não uma melhora da fonte.

- 9c99cab: Adiciona a NF3e (Nota Fiscal de Energia Elétrica Eletrônica, modelo 66) como oitavo documento.

  - `@monitor-sefaz/catalog`: `DocumentType.NF3e`, o mapa UF → autorizador (MG, MS, MT e PR próprios, as demais UFs no SVRS) e os endpoints de `NF3eStatusServico` dos cinco autorizadores, em produção e homologação, da "Relação de Serviços Web" do SVRS. `listAll` passa de 189 para 216 serviços.
  - `@monitor-sefaz/core`: `NF3eStatusEnvelopeBuilder` e `NF3eStatusParser` (`consStatServNF3e` / `retConsStatServNF3e`, versão 1.00, sem cabeçalho SOAP), registrados na `CheckerFactory`, e a página `Nf3e/Disponibilidade` do SVRS no `SvrsProvider`, que cobre 23 UFs. O IntegraNotas não publica o NF3e.

- 29ce6ca: Adiciona a NFCom (Nota Fiscal Fatura de Serviços de Comunicação Eletrônica, modelo 62) como sétimo documento.

  - `@monitor-sefaz/catalog`: `DocumentType.NFCom`, o mapa UF → autorizador (MG, MS e MT próprios, as demais UFs no SVRS) e os endpoints de `NFComStatusServico` dos quatro autorizadores, em produção e homologação, conferidos com a "Relação de Serviços Web" do SVRS. Quem itera `Object.values(DocumentType)` passa a receber a NFCom, e `listAll` passa de 162 para 189 serviços.
  - `@monitor-sefaz/core`: `NFComStatusEnvelopeBuilder` e `NFComStatusParser` (`consStatServNFCom` / `retConsStatServNFCom`, versão 1.00, sem cabeçalho SOAP), registrados na `CheckerFactory`. A página `Nfcom/Disponibilidade` do SVRS entra no `SvrsProvider` (24 UFs) e a rota `nfcom` entra no `IntegraNotasProvider` (27 UFs).

### Patch Changes

- Updated dependencies [9c99cab]
- Updated dependencies [29ce6ca]
  - @monitor-sefaz/catalog@0.5.0

## 0.4.0

### Minor Changes

- b055f90: Camada de detalhe por autorizador × ambiente × serviço: o estado de cada operação (autorização, consulta, eventos, status…) que o SVRS e a página da Receita já publicam e que o consenso reduzia a um estado só.

  - `@monitor-sefaz/contracts`: `detailSnapshotSchema`, `authorizerDetailSchema` e `operationStatusSchema`, com os tipos `DetailSnapshotDTO`, `AuthorizerDetailDTO` e `OperationStatusDTO`.
  - `@monitor-sefaz/core`:
    - `DetailCollector` monta o detalhe a partir das páginas já baixadas numa rodada (`PageLog`), mais as páginas de homologação da Receita (`HOMOLOGATION_AVAILABILITY_URLS`).
    - `ConsensusCollector.createForNode` aceita um `PageLog` opcional como terceiro argumento e grava nele as páginas do SVRS e da Receita.
    - `HttpAvailabilityProvider` ganha um gancho `onPage` opcional (quarto argumento do construtor) e o método `fetchPage`.
    - `AvailabilityParser` ganha `parseOperations`, que lê todas as colunas de serviço, com o nome do cabeçalho.
    - `recordingSvrsFetcher` guarda as páginas baixadas por um fetcher do SVRS.

- 017a27f: A cobertura de cada fonte do consenso passa a ser medida só sobre os documentos que ela publica.

  - `@monitor-sefaz/core`: `StatusCollectorLike` ganha o método opcional `supportedDocuments()`. O `SvrsCollector`, o `AvailabilityCollector` (que conta MDF-e e DC-e, derivados do SVRS) e o `IntegraNotasCollector` passam a implementá-lo. Em `collectWithDiagnostics`, o `expected` de cada fonte vira o número de serviços do catálogo nesses documentos, e o `degraded` usa esse número. Antes, todo `expected` era o catálogo inteiro, e um documento que só parte das fontes publica empurrava as outras para baixo do piso. Um coletor próprio que não implemente o método continua medido sobre o catálogo inteiro, como antes.
  - `@monitor-sefaz/contracts`: a documentação de `SourceHealthDTO.expected` passa a descrever o novo significado. O formato do campo não muda.

### Patch Changes

- 379515f: `SvrsCollector`, `AvailabilityCollector` e `IntegraNotasCollector` buscam as páginas dos documentos em paralelo, e não mais uma depois da outra. Com um portal fora do ar, cada página gasta as tentativas com timeout antes de desistir, e em série isso somava minutos por coleta (cerca de 6 minutos com o SVRS fora). O resultado continua na ordem dos documentos e uma página que falha continua não derrubando as outras.
- fe9fe01: O `SvrsProvider` passa a ler a NFC-e na página de disponibilidade da própria NFC-e (`/Nfce/Disponibilidade`), em vez da página da NF-e. As duas páginas têm webservices e cStat diferentes: a da NFC-e não lista o "WS Consulta Recibo" e traz outros códigos na consulta de situação. Por isso o estado da NFC-e vindo do SVRS refletia a infraestrutura da NF-e. `SVRS_URLS[DocumentType.NFCe]` muda de valor.
- Updated dependencies [e7b12b3]
- Updated dependencies [66c5890]
  - @monitor-sefaz/catalog@0.4.0

## 0.3.0

### Minor Changes

- ced8f08: Adiciona o BP-e (Bilhete de Passagem Eletrônico, modelo 63) como sexto documento.

  - `@monitor-sefaz/catalog`: `DocumentType.BPe`, os endpoints de `BPeStatusServico` dos seis autorizadores (MG, MS, MT, PR, SP e SVRS) e o mapa UF → autorizador, em que as demais UFs, inclusive o RS, delegam ao SVRS. Quem itera `Object.values(DocumentType)` passa a receber o BP-e, e `listAll` passa de 135 para 162 serviços.
  - `@monitor-sefaz/core`: `BPeStatusEnvelopeBuilder` e `BPeStatusParser` para a consulta SOAP (`consStatServBPe` / `retConsStatServBPe`, versão 1.00), registrados na `CheckerFactory`, e a página pública `Bpe/Disponibilidade` do SVRS no `SvrsProvider`, que cobre sem certificado as 22 UFs autorizadas ali.

### Patch Changes

- Updated dependencies [ced8f08]
  - @monitor-sefaz/catalog@0.3.0

## 0.2.0

### Minor Changes

- a427f54: O `axios-cookiejar-support` sobe para a v7, que só roda em Node 22 ou superior. Por isso o `@monitor-sefaz/core` passa a exigir Node 22: `engines.node` vai de `>=20` para `>=22`.

### Patch Changes

- Updated dependencies [e0a6aae]
  - @monitor-sefaz/catalog@0.2.0
