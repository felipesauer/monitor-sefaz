---
'@monitor-sefaz/catalog': patch
---

Corrige as URLs de "consulta status do serviço" da NF-e e dá à NFC-e um mapa próprio de endpoints, conferidos com a "Relação de Serviços Web" do portal DFe do SVRS em 2026-11-10.

- NF-e: AM e MT passam ao serviço da versão 4 (`NfeStatusServico4`, antes `NfeStatusServico2` e `Nfews`); o RS passa ao host da SEFAZ-RS (`nfe.sefazrs.rs.gov.br`, antes o do SVRS); a homologação da BA e a de PE são corrigidas. As entradas de CE e PA, que nunca eram usadas (as duas UFs autorizam no SVRS), saem do mapa.
- NFC-e: deixa de reaproveitar os hosts da NF-e. AM, MG, MS, MT, PR, RS, SP e SVRS passam aos hosts da NFC-e (`nfce.*`); GO segue no mesmo host da NF-e, como na relação oficial. A URL de MG vem do nfephp-org/sped-nfe, porque o SVRS não a lista.

Quem resolve NFC-e com `Catalog.resolve(DocumentType.NFCe, ...)` passa a receber o host certo; a consulta SOAP de status deixa de perguntar à NF-e pelo estado da NFC-e.
