---
'@monitor-sefaz/catalog': minor
---

O CT-e de AP, PE e RR passa a ser autorizado pela Sefaz Virtual de São Paulo (SVSP), como diz a "Relação de Serviços Web" do Portal do CT-e. Antes o catálogo os mandava ao SVRS.

- `AuthorizerCode` ganha o valor `'SVSP'`. Quem trata os códigos de forma exaustiva (um `switch` sem `default`, um `Record<AuthorizerCode, …>`) precisa acrescentá-lo.
- `Catalog.resolveAuthorizer(DocumentType.CTe, 'AP' | 'PE' | 'RR')` devolve `'SVSP'`, e `resolve` aponta para o `CTeStatusServicoV4` da SEFAZ-SP (a SVSP roda na infraestrutura dela), em produção e homologação.
- A contingência do CT-e (SVC-SP e SVC-RS) segue fora do catálogo.
