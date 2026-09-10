# @monitor-sefaz/core

Motor de coleta de disponibilidade dos webservices da SEFAZ: consenso
multi-fonte com precedência oficial, parsers dos portais públicos, envelopes
SOAP por documento e leitura das Notas Técnicas.

É o núcleo do [Monitor SEFAZ](https://github.com/felipesauer/monitor-sefaz) — o
mesmo motor usado pelo coletor, pelo Cloudflare Worker e pela API self-host.

## Duas formas de descobrir o status

**Sem certificado digital (padrão).** Cruza fontes públicas por consenso, com
precedência para as oficiais. Roda em qualquer lugar, inclusive num Worker.

**Via SOAP (`nfeStatusServico`).** Dados mais ricos, mas exige saída de rede e,
em vários autorizadores, um certificado A1 (mTLS).

## Instalação

    npm i @monitor-sefaz/core

## Consenso multi-fonte

Cada fonte é declarada como oficial ou não. As oficiais decidem o estado; as
demais só preenchem o que as oficiais não publicam. Uma fonte que falha é
ignorada (`allSettled`) sem derrubar a coleta.

```ts
import {
  AvailabilityCollector,
  ConsensusCollector,
  HttpAvailabilityProvider,
  IntegraNotasCollector,
  SvrsCollector,
  SvrsProvider,
  createHttpIntegraNotasFetcher,
  createHttpSvrsFetcher,
} from '@monitor-sefaz/core';

const collector = new ConsensusCollector([
  {
    name: 'svrs',
    official: true,
    collector: new SvrsCollector(new SvrsProvider(createHttpSvrsFetcher())),
  },
  {
    name: 'availability',
    official: true,
    collector: new AvailabilityCollector(new HttpAvailabilityProvider()),
  },
  {
    name: 'integranotas',
    official: false,
    collector: IntegraNotasCollector.create(createHttpIntegraNotasFetcher()),
  },
]);

const status = await collector.collect();
// [{ document: 'NFe', uf: 'SP', authorizer: 'SP', state: 'OPERATIONAL',
//    cStat: 107, latencyMs: 412, source: 'svrs', sourceCheckedAt: '...' }, ...]
```

Os _fetchers_ são injetados: em Node use os `createHttp*` prontos, e em runtimes
sem `Buffer` (Cloudflare Workers) passe o seu, feito com `fetch` nativo. É o que
mantém o mesmo motor rodando nas três pontas do projeto.

### Cobertura e drift

`ConsensusCollector` reporta a cobertura de cada fonte. Combinada com o piso do
catálogo, ela distingue os dois casos que um monitor não pode confundir: "o
serviço da SEFAZ caiu" e "a nossa fonte parou de responder ou mudou o HTML".

```ts
import { Catalog, Environment } from '@monitor-sefaz/catalog';

if (!new Catalog().meetsCoverageFloor(status.length, Environment.Production)) {
  throw new Error('coleta degradada — não publicar');
}
```

## Consulta SOAP direta

`CheckerFactory.create()` monta um `StatusChecker` com os builders e parsers de
todos os documentos já registrados. O alvo da consulta é a própria entrada do
catálogo:

```ts
import { AxiosSoapClient, CheckerFactory } from '@monitor-sefaz/core';
import { Catalog, DocumentType, Environment } from '@monitor-sefaz/catalog';
import { readFile } from 'node:fs/promises';

const checker = CheckerFactory.create({
  client: new AxiosSoapClient({
    // Vários autorizadores exigem certificado A1 (mTLS).
    certificate: { pfx: await readFile('cert.pfx'), passphrase: '...' },
  }),
  options: { timeoutMs: 15_000 },
});

const target = new Catalog().resolve(DocumentType.NFe, 'SP', Environment.Production);
if (target) {
  const result = await checker.check(target);
  // { state, cStat, xMotivo, latencyMs, ... }
}
```

Erros de rede e de parse viram `ServiceState.Error` no resultado, em vez de
exceção — uma UF fora do ar não interrompe a varredura das outras.

## Notas Técnicas

```ts
import { TechnicalNotesProvider, createHttpTechnicalNotesFetcher } from '@monitor-sefaz/core';

const notes = await new TechnicalNotesProvider(createHttpTechnicalNotesFetcher()).fetch();
```

## Aviso

Depende do HTML de portais públicos, que muda sem aviso. O repositório roda uma
verificação de _drift_ diária, mas trate uma coleta degradada como sinal para
investigar, não como indisponibilidade da SEFAZ.

Projeto independente, sem afiliação com a SEFAZ ou a Receita Federal.

## Licença

[MIT](LICENSE) © Felipe Sauer
