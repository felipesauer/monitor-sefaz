# Monitor SEFAZ

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-strict-3178c6)](https://www.typescriptlang.org)

Monitor de disponibilidade dos webservices da SEFAZ para documentos fiscais
eletrônicos brasileiros — NF-e, NFC-e, CT-e, MDF-e e DC-e, por unidade federativa.

Coleta o status de cada autorizador, classifica o resultado e o apresenta num
dashboard com histórico de uptime. Projeto open-source e independente, sem
afiliação com a SEFAZ ou a Receita Federal.

Você pode [acessar o monitor online](https://felipesauer.github.io/monitor-sefaz/).

## O que ele monitora

Os cinco documentos fiscais eletrônicos, nas 27 UFs, resolvendo automaticamente
qual autorizador atende cada estado (próprio, SVRS, SVAN e demais):

- NF-e — Nota Fiscal Eletrônica (modelo 55)
- NFC-e — Nota Fiscal de Consumidor Eletrônica (modelo 65)
- CT-e — Conhecimento de Transporte Eletrônico
- MDF-e — Manifesto Eletrônico de Documentos Fiscais
- DC-e — Declaração de Conteúdo eletrônica

Cada serviço é classificado em um de quatro estados: operacional (cStat 107),
instável (108), indisponível (109) ou sem dados.

## Como obtém os dados

O modo padrão não exige certificado digital. O monitor cruza fontes públicas
por consenso, com precedência para as oficiais: o
[portal do SVRS](https://dfe-portal.svrs.rs.gov.br) e a
[página de disponibilidade da Receita](https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx)
decidem o estado de cada serviço, e o IntegraNotas (API JSON) preenche as UFs e
documentos que as fontes oficiais não publicam. MDF-e e DC-e são centralizados
no SVRS, então derivam do estado desse autorizador.

A consulta SOAP direta aos webservices (modo `soap`) fornece dados mais ricos,
mas exige saída de rede e, em vários autorizadores, um certificado A1. Ela é
opcional e desativada por padrão.

## Uso

A forma mais simples é acessar o site publicado. Os dados são atualizados de
hora em hora por um GitHub Actions; a granularidade sub-horária não é honrada de
forma confiável pelo agendador do GitHub.

Para rodar localmente é necessário Node 20 ou superior e pnpm.

    pnpm install

    # Gera os arquivos de status consultando as fontes públicas
    pnpm --filter @monitor-sefaz/collector collect ./apps/web/public/data

    # Sobe o dashboard em http://localhost:5173
    pnpm --filter @monitor-sefaz/web dev

## Deploy

O mesmo motor de coleta alimenta três formas de rodar.

**SPA estática (GitHub Pages).** Um GitHub Actions coleta e versiona os JSONs; a
SPA apenas os lê. Não requer infraestrutura.

**Cloudflare Worker.** O Worker faz a coleta ao vivo com CORS e a SPA o consome.

    pnpm --filter @monitor-sefaz/worker deploy   # requer wrangler login

**Self-host.** API Fastify com Redis e scheduler, servindo o dashboard.

    docker compose up --build   # http://localhost:3333

## Configuração

O front escolhe a fonte de dados por variável de ambiente. Quando
`VITE_API_BASE_URL` está definida, consome a API ou o Worker ao vivo; quando
vazia, lê os JSONs estáticos.

A API self-host lê as variáveis abaixo de um arquivo `.env` na raiz (veja
`.env.example`):

- `STATUS_SOURCE` — `hybrid` (consenso multi-fonte, padrão), `availability` (só
  a página oficial) ou `soap` (consulta SOAP direta)
- `REDIS_URL` — conexão com o Redis
- `SEFAZ_CERT_PATH` e `SEFAZ_CERT_PASSPHRASE` — certificado A1 (.pfx) para o
  modo `soap`
- `CRON_EXPRESSION`, `SEFAZ_TIMEOUT_MS`, `SEFAZ_CONCURRENCY`,
  `HISTORY_RETENTION_MS`, `RATE_LIMIT_MAX`

Homologação não aparece: a página pública da SEFAZ cobre apenas produção, e o
ambiente de homologação só é alcançável pelo modo `soap`.

## Desenvolvimento

Monorepo TypeScript gerenciado com pnpm e Turborepo.

    packages/catalog     UFs, cStat, endpoints e o mapa UF -> autorizador
    packages/core        motor de coleta: consenso multi-fonte e SOAP
    packages/contracts   schemas Zod e DTOs compartilhados
    apps/collector       CLI que gera os JSONs versionados
    apps/worker          Cloudflare Worker de coleta ao vivo
    apps/api             API Fastify self-host: scheduler, REST, SSE e Redis
    apps/web             dashboard React + Vite

Comandos, a partir da raiz:

    pnpm build        builda todos os pacotes e apps
    pnpm dev          sobe os apps em modo desenvolvimento
    pnpm test         roda os testes (Vitest)
    pnpm typecheck    checagem de tipos
    pnpm lint         ESLint

As respostas da SEFAZ são mockadas por fixtures em `packages/core/test`, de modo
que os testes nunca dependem da rede.

## Referências

Portais oficiais de disponibilidade e fontes que o monitor consome:

- [Portal Nacional da NF-e — Disponibilidade](https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx)
- [Portal Nacional do CT-e — Disponibilidade](https://www.cte.fazenda.gov.br/portal/disponibilidade.aspx)
- [Portal de Documentos Fiscais Eletrônicos do SVRS](https://dfe-portal.svrs.rs.gov.br)
- [IntegraNotas — Monitor SEFAZ](https://integranotas.com.br/doc/sefaz/monitor)

## Contribuindo

Contribuições são bem-vindas. O fluxo de desenvolvimento, os padrões de código e
o passo a passo para adicionar um documento ou autorizador estão em
[CONTRIBUTING.md](CONTRIBUTING.md). Para relatar uma falha de segurança, veja
[SECURITY.md](SECURITY.md).

## Licença

[MIT](LICENSE) © Felipe Sauer
