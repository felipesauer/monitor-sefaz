---
'@monitor-sefaz/core': patch
---

O `SvrsProvider` passa a ler a NFC-e na página de disponibilidade da própria NFC-e (`/Nfce/Disponibilidade`), em vez da página da NF-e. As duas páginas têm webservices e cStat diferentes: a da NFC-e não lista o "WS Consulta Recibo" e traz outros códigos na consulta de situação. Por isso o estado da NFC-e vindo do SVRS refletia a infraestrutura da NF-e. `SVRS_URLS[DocumentType.NFCe]` muda de valor.
