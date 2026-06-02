# Monitor SEFAZ

Monitor open-source de disponibilidade, em tempo real, dos webservices da SEFAZ
para os documentos fiscais eletrônicos brasileiros: **NF-e, NFC-e, CT-e, MDF-e e
DC-e**, por UF e ambiente.

Inspirado no [monitorsefaz.com.br](https://monitorsefaz.com.br). Consulta o
serviço de _status do serviço_ de cada autorizador via SOAP, classifica o
resultado (operacional / instável / indisponível / erro), guarda histórico curto
e exibe tudo num dashboard que atualiza em tempo real.

## Arquitetura

Monorepo TypeScript (pnpm + Turborepo). Tudo escrito em classes, seguindo SOLID e
Clean Code, com testes unitários em Vitest (`describe`/`it`).

```
packages/
  catalog/     @monitor-sefaz/catalog    dados do MOC: UFs, cStat, endpoints e
                                         mapa UF→autorizador por documento
  core/        @monitor-sefaz/core       motor de consulta: EnvelopeBuilder
                                         (Strategy por documento), parser
                                         namespace-agnóstico, SoapClient,
                                         StatusChecker, BatchChecker, Registry
  contracts/   @monitor-sefaz/contracts  schemas Zod + DTOs compartilhados
apps/
  api/         Fastify: scheduler in-process (node-cron) + REST + SSE + Redis
  web/         React + Vite: dashboard (TanStack Query + EventSource)
```

- **Persistência:** somente **Redis** — snapshot atual (HASH) + histórico curto
  (ZSET, podado por retenção) + pub/sub para tempo real. Sem banco relacional.
- **Tempo real:** o scheduler publica deltas no Redis; a API faz fan-out via
  **SSE**; o front aplica patch otimista no cache.
- **Extensível:** novo documento = 1 `EnvelopeBuilder` + 1 `ResponseParser`
  registrados na `CheckerFactory` (Open/Closed). Novo/alterado autorizador =
  editar `@monitor-sefaz/catalog` (data-only).

### Estados

| cStat | Estado        | Cor      |
| ----- | ------------- | -------- |
| 107   | Operacional   | verde    |
| 108   | Instável      | amarelo  |
| 109   | Indisponível  | vermelho |
| —     | Erro (HTML, SOAP Fault, timeout, TLS) | cinza |

> **Certificado A1:** vários autorizadores exigem autenticação mTLS. Sem o
> certificado do contribuinte, o handshake TLS falha (estado `Erro`). Configure
> `SEFAZ_CERT_PATH` / `SEFAZ_CERT_PASSPHRASE` para habilitar.

## Rodando

### Com Docker (recomendado)

```bash
docker compose up --build
# dashboard + API em http://localhost:3333
```

### Desenvolvimento

```bash
pnpm install
docker compose up -d redis          # ou um Redis local
pnpm dev                            # sobe API (3333) e web (5173) via Turborepo
```

O Vite faz proxy de `/api` para a API em dev. Variáveis em `.env.example`.

## API

| Método | Rota                                   | Descrição                              |
| ------ | -------------------------------------- | -------------------------------------- |
| GET    | `/api/v1/health`                       | Liveness                               |
| GET    | `/api/v1/status`                       | Snapshot atual (`?env=&document=&uf=`) |
| GET    | `/api/v1/status/:document/:uf`         | Status de um serviço                   |
| GET    | `/api/v1/summary`                      | Agregado por documento e autorizador   |
| GET    | `/api/v1/services/:id/history`         | Série curta (`?period=1h\|6h\|24h\|72h`) |
| GET    | `/api/v1/services/:id/uptime`          | % de disponibilidade no período        |
| GET    | `/api/v1/incidents`                    | Incidentes derivados das transições    |
| GET    | `/api/v1/stream`                       | SSE: atualizações em tempo real        |

O `:id` de um serviço é `{documento}:{uf}` (ex: `NFe:SP`).

## Testes

```bash
pnpm test          # todos os pacotes (Vitest)
pnpm typecheck     # checagem de tipos (project references)
pnpm lint
```

As respostas SOAP são mockadas por fixtures em `packages/core/test/fixtures/` —
o CI nunca bate na SEFAZ real.

## Licença

MIT.
