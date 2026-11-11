---
'@monitor-sefaz/catalog': minor
'@monitor-sefaz/core': minor
---

Adiciona a NFCom (Nota Fiscal Fatura de Serviços de Comunicação Eletrônica, modelo 62) como sétimo documento.

- `@monitor-sefaz/catalog`: `DocumentType.NFCom`, o mapa UF → autorizador (MG, MS e MT próprios, as demais UFs no SVRS) e os endpoints de `NFComStatusServico` dos quatro autorizadores, em produção e homologação, conferidos com a "Relação de Serviços Web" do SVRS. Quem itera `Object.values(DocumentType)` passa a receber a NFCom, e `listAll` passa de 162 para 189 serviços.
- `@monitor-sefaz/core`: `NFComStatusEnvelopeBuilder` e `NFComStatusParser` (`consStatServNFCom` / `retConsStatServNFCom`, versão 1.00, sem cabeçalho SOAP), registrados na `CheckerFactory`. A página `Nfcom/Disponibilidade` do SVRS entra no `SvrsProvider` (24 UFs) e a rota `nfcom` entra no `IntegraNotasProvider` (27 UFs).
