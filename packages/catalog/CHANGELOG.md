# @monitor-sefaz/catalog

## 0.5.0

### Minor Changes

- 9c99cab: Adiciona a NF3e (Nota Fiscal de Energia Elétrica Eletrônica, modelo 66) como oitavo documento.

  - `@monitor-sefaz/catalog`: `DocumentType.NF3e`, o mapa UF → autorizador (MG, MS, MT e PR próprios, as demais UFs no SVRS) e os endpoints de `NF3eStatusServico` dos cinco autorizadores, em produção e homologação, da "Relação de Serviços Web" do SVRS. `listAll` passa de 189 para 216 serviços.
  - `@monitor-sefaz/core`: `NF3eStatusEnvelopeBuilder` e `NF3eStatusParser` (`consStatServNF3e` / `retConsStatServNF3e`, versão 1.00, sem cabeçalho SOAP), registrados na `CheckerFactory`, e a página `Nf3e/Disponibilidade` do SVRS no `SvrsProvider`, que cobre 23 UFs. O IntegraNotas não publica o NF3e.

- 29ce6ca: Adiciona a NFCom (Nota Fiscal Fatura de Serviços de Comunicação Eletrônica, modelo 62) como sétimo documento.

  - `@monitor-sefaz/catalog`: `DocumentType.NFCom`, o mapa UF → autorizador (MG, MS e MT próprios, as demais UFs no SVRS) e os endpoints de `NFComStatusServico` dos quatro autorizadores, em produção e homologação, conferidos com a "Relação de Serviços Web" do SVRS. Quem itera `Object.values(DocumentType)` passa a receber a NFCom, e `listAll` passa de 162 para 189 serviços.
  - `@monitor-sefaz/core`: `NFComStatusEnvelopeBuilder` e `NFComStatusParser` (`consStatServNFCom` / `retConsStatServNFCom`, versão 1.00, sem cabeçalho SOAP), registrados na `CheckerFactory`. A página `Nfcom/Disponibilidade` do SVRS entra no `SvrsProvider` (24 UFs) e a rota `nfcom` entra no `IntegraNotasProvider` (27 UFs).

## 0.4.0

### Minor Changes

- e7b12b3: O CT-e de AP, PE e RR passa a ser autorizado pela Sefaz Virtual de São Paulo (SVSP), como diz a "Relação de Serviços Web" do Portal do CT-e. Antes o catálogo os mandava ao SVRS.

  - `AuthorizerCode` ganha o valor `'SVSP'`. Quem trata os códigos de forma exaustiva (um `switch` sem `default`, um `Record<AuthorizerCode, …>`) precisa acrescentá-lo.
  - `Catalog.resolveAuthorizer(DocumentType.CTe, 'AP' | 'PE' | 'RR')` devolve `'SVSP'`, e `resolve` aponta para o `CTeStatusServicoV4` da SEFAZ-SP (a SVSP roda na infraestrutura dela), em produção e homologação.
  - A contingência do CT-e (SVC-SP e SVC-RS) segue fora do catálogo.

### Patch Changes

- 66c5890: Corrige as URLs de "consulta status do serviço" da NF-e e dá à NFC-e um mapa próprio de endpoints, conferidos com a "Relação de Serviços Web" do portal DFe do SVRS em 2026-11-10.

  - NF-e: AM e MT passam ao serviço da versão 4 (`NfeStatusServico4`, antes `NfeStatusServico2` e `Nfews`); o RS passa ao host da SEFAZ-RS (`nfe.sefazrs.rs.gov.br`, antes o do SVRS); a homologação da BA e a de PE são corrigidas. As entradas de CE e PA, que nunca eram usadas (as duas UFs autorizam no SVRS), saem do mapa.
  - NFC-e: deixa de reaproveitar os hosts da NF-e. AM, MG, MS, MT, PR, RS, SP e SVRS passam aos hosts da NFC-e (`nfce.*`); GO segue no mesmo host da NF-e, como na relação oficial. A URL de MG vem do nfephp-org/sped-nfe, porque o SVRS não a lista.

  Quem resolve NFC-e com `Catalog.resolve(DocumentType.NFCe, ...)` passa a receber o host certo; a consulta SOAP de status deixa de perguntar à NF-e pelo estado da NFC-e.

## 0.3.0

### Minor Changes

- ced8f08: Adiciona o BP-e (Bilhete de Passagem Eletrônico, modelo 63) como sexto documento.

  - `@monitor-sefaz/catalog`: `DocumentType.BPe`, os endpoints de `BPeStatusServico` dos seis autorizadores (MG, MS, MT, PR, SP e SVRS) e o mapa UF → autorizador, em que as demais UFs, inclusive o RS, delegam ao SVRS. Quem itera `Object.values(DocumentType)` passa a receber o BP-e, e `listAll` passa de 135 para 162 serviços.
  - `@monitor-sefaz/core`: `BPeStatusEnvelopeBuilder` e `BPeStatusParser` para a consulta SOAP (`consStatServBPe` / `retConsStatServBPe`, versão 1.00), registrados na `CheckerFactory`, e a página pública `Bpe/Disponibilidade` do SVRS no `SvrsProvider`, que cobre sem certificado as 22 UFs autorizadas ali.

## 0.2.0

### Minor Changes

- e0a6aae: `UF_INFO` passa a trazer a região de cada UF (`regiao`, com a ordem do IBGE em `REGIONS`), e o novo `Catalog.resolveContingency` informa para qual SVC (SVC-AN ou SVC-RS) vai a NF-e de cada UF quando a contingência é ativada.
