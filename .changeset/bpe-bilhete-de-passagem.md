---
'@monitor-sefaz/catalog': minor
'@monitor-sefaz/core': minor
---

Adiciona o BP-e (Bilhete de Passagem Eletrônico, modelo 63) como sexto documento.

- `@monitor-sefaz/catalog`: `DocumentType.BPe`, os endpoints de `BPeStatusServico` dos seis autorizadores (MG, MS, MT, PR, SP e SVRS) e o mapa UF → autorizador, em que as demais UFs, inclusive o RS, delegam ao SVRS. Quem itera `Object.values(DocumentType)` passa a receber o BP-e, e `listAll` passa de 135 para 162 serviços.
- `@monitor-sefaz/core`: `BPeStatusEnvelopeBuilder` e `BPeStatusParser` para a consulta SOAP (`consStatServBPe` / `retConsStatServBPe`, versão 1.00), registrados na `CheckerFactory`, e a página pública `Bpe/Disponibilidade` do SVRS no `SvrsProvider`, que cobre sem certificado as 22 UFs autorizadas ali.
