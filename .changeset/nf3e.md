---
'@monitor-sefaz/catalog': minor
'@monitor-sefaz/core': minor
---

Adiciona a NF3e (Nota Fiscal de Energia Elétrica Eletrônica, modelo 66) como oitavo documento.

- `@monitor-sefaz/catalog`: `DocumentType.NF3e`, o mapa UF → autorizador (MG, MS, MT e PR próprios, as demais UFs no SVRS) e os endpoints de `NF3eStatusServico` dos cinco autorizadores, em produção e homologação, da "Relação de Serviços Web" do SVRS. `listAll` passa de 189 para 216 serviços.
- `@monitor-sefaz/core`: `NF3eStatusEnvelopeBuilder` e `NF3eStatusParser` (`consStatServNF3e` / `retConsStatServNF3e`, versão 1.00, sem cabeçalho SOAP), registrados na `CheckerFactory`, e a página `Nf3e/Disponibilidade` do SVRS no `SvrsProvider`, que cobre 23 UFs. O IntegraNotas não publica o NF3e.
