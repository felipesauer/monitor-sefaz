# @monitor-sefaz/catalog

Catálogo dos documentos fiscais eletrônicos brasileiros: qual autorizador atende
cada UF, o endpoint de cada webservice e a tabela de `cStat`.

Sem dependências, sem I/O — são dados estáticos e a lógica de resolução em cima
deles. Faz parte do [Monitor SEFAZ](https://github.com/felipesauer/monitor-sefaz),
mas é útil sozinho para qualquer integração com NF-e, NFC-e, CT-e, MDF-e ou DC-e.

## O problema que resolve

"Para onde eu mando a consulta de NF-e do Acre?" não tem resposta óbvia: o AC não
tem autorizador próprio, quem atende é o SVRS. O Maranhão usa SVAN. Em
contingência muda de novo. E o `cUF` do envelope, nesses casos, é o do
autorizador virtual, não o da UF. Esse mapeamento costuma acabar hard-coded e
desatualizado em cada projeto.

## Instalação

    npm i @monitor-sefaz/catalog

## Uso

```ts
import { Catalog, DocumentType, Environment } from '@monitor-sefaz/catalog';

const catalog = new Catalog();

// Quem atende NF-e no Acre?
catalog.resolveAuthorizer(DocumentType.NFe, 'AC'); // 'SVRS'

// Entrada completa: autorizador, URL do webservice e cUF do envelope.
const entry = catalog.resolve(DocumentType.NFe, 'AC', Environment.Production);
// { document: 'NFe', uf: 'AC', authorizer: 'SVRS', environment: 1,
//   cUF: 12, url: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/...' }

// Todas as 27 UFs de um documento, ou os 135 serviços de uma vez.
catalog.list(DocumentType.CTe, Environment.Production); // 27 entradas
catalog.listAll(Environment.Production); // 135 entradas
```

Dados e constantes também são exportados diretamente:

```ts
import {
  ALL_UFS, // as 27 siglas
  CSTAT, // { 107: 'Serviço em Operação', ... }
  CSTAT_OPERATIONAL, // 107
  CSTAT_SLOWDOWN, // 108
  CSTAT_DOWN, // 109
  UF_AUTHORIZERS, // mapa documento → UF → autorizador
  UF_INFO, // nome, código IBGE e região de cada UF
} from '@monitor-sefaz/catalog';
```

## Ambientes

`Environment.Production` (1) e `Environment.Homologation` (2) — os valores
numéricos coincidem com o `tpAmb` da SEFAZ, então dá para usar o enum direto na
montagem do envelope.

## Aviso

Endpoints de webservice mudam sem aviso prévio. O repositório roda uma
verificação periódica, mas **valide antes de usar em produção** e
[abra uma issue](https://github.com/felipesauer/monitor-sefaz/issues) se algum
estiver desatualizado.

Projeto independente, sem afiliação com a SEFAZ ou a Receita Federal.

## Licença

[MIT](LICENSE) © Felipe Sauer
