# Monitor SEFAZ

Monitor open-source de disponibilidade dos webservices da SEFAZ para os
documentos fiscais eletrônicos brasileiros: **NF-e, NFC-e, CT-e, MDF-e e DC-e**,
por UF. Inspirado no [monitorsefaz.com.br](https://monitorsefaz.com.br).

Coleta o status de cada autorizador a partir da **página oficial de
disponibilidade** da SEFAZ (pública, sem certificado), classifica o resultado
(operacional / instável / indisponível / sem dados), guarda histórico curto e
exibe num dashboard com tema claro/escuro.

## Como rodar — 3 modos

O mesmo motor de coleta (`@monitor-sefaz/core`) alimenta três formas de deploy:

### 1. SPA estática (GitHub Pages) — sem servidor

O caminho mais simples: a SPA lê JSONs versionados (`apps/web/public/data/`) que
um **GitHub Actions** ([collect.yml](.github/workflows/collect.yml)) regenera a
cada 15 min. Sem Redis, sem cron próprio, sem backend.

```bash
pnpm --filter @monitor-sefaz/collector collect "$PWD/apps/web/public/data"  # gera os dados
BASE_PATH="/<repo>/" pnpm --filter "@monitor-sefaz/web..." build            # build estático
# publique apps/web/dist (o deploy automático está em deploy-pages.yml)
```

### 2. Cloudflare Worker (ao vivo, sem servidor persistente)

A SPA consome um Worker que faz o scraping ao vivo com CORS. Sem backend próprio.

```bash
pnpm --filter @monitor-sefaz/worker deploy        # requer `wrangler login`
# build a SPA apontando para o worker:
VITE_API_BASE_URL="https://<seu-worker>.workers.dev" pnpm --filter "@monitor-sefaz/web..." build
```

### 3. Self-host completo (API + Redis) — Docker

Servidor Fastify com scheduler, histórico no Redis e tempo real via SSE, servindo
o dashboard embutido.

```bash
docker compose up --build      # dashboard + API em http://localhost:3333
```

## Arquitetura

Monorepo TypeScript (pnpm + Turborepo). Classes, SOLID e Clean Code; testes
Vitest (`describe`/`it`). Interface em PT-BR; código, contratos e APIs em inglês.

```
packages/
  catalog/     @monitor-sefaz/catalog    dados do MOC: UFs, cStat, endpoints e
                                         mapa UF→autorizador por documento
  core/        @monitor-sefaz/core       motor: AvailabilityCollector (scraping),
                                         SOAP (EnvelopeBuilder/Parser/Checker)
  contracts/   @monitor-sefaz/contracts  schemas Zod + DTOs compartilhados
apps/
  collector/   CLI Node → gera status.json / summary.json / history.json
  worker/      Cloudflare Worker → scraping ao vivo com CORS
  api/         Fastify self-host: scheduler + REST + SSE + Redis
  web/         React + Vite: status page (fonte de dados plugável)
```

- **Fonte de dados do front (plugável):** `VITE_API_BASE_URL` definido → consome
  API/Worker ao vivo; ausente → lê os JSONs estáticos versionados.
- **Coleta:** página oficial de disponibilidade (NF-e e CT-e); MDF-e e DC-e são
  derivados do autorizador SVRS (ambiente nacional desses documentos). Mapa
  UF→autorizador conforme [`sped-nfe`](https://github.com/nfephp-org/sped-nfe).
- **SOAP direto** (opcional, modo self-host `STATUS_SOURCE=soap`): dados mais
  ricos, mas exige rede e **certificado A1** (`SEFAZ_CERT_PATH`/`SEFAZ_CERT_PASSPHRASE`).
- **Extensível:** novo documento = 1 `EnvelopeBuilder` + 1 `ResponseParser` na
  `CheckerFactory`; novo autorizador = editar `@monitor-sefaz/catalog` (data-only).

### Estados

| cStat | Estado       | Cor      |
| ----- | ------------ | -------- |
| 107   | Operacional  | verde    |
| 108   | Instável     | amarelo  |
| 109   | Indisponível | vermelho |
| —     | Sem dados    | cinza    |

## API (modos Worker / self-host)

| Método | Rota                            | Descrição                            |
| ------ | ------------------------------- | ------------------------------------ |
| GET    | `/api/v1/health`                | Liveness                             |
| GET    | `/api/v1/status`                | Snapshot atual (`?document=&uf=`)    |
| GET    | `/api/v1/summary`               | Agregado por documento e autorizador |
| GET    | `/api/v1/services/:id/history`  | Série curta (`?period=1h\|6h\|24h\|72h`) |
| GET    | `/api/v1/services/:id/uptime`   | % de disponibilidade no período      |
| GET    | `/api/v1/incidents`             | Incidentes derivados das transições  |
| GET    | `/api/v1/stream`                | SSE: atualizações em tempo real (self-host) |

`:id` de um serviço é `{documento}:{uf}` (ex: `NFe:SP`). No modo estático, a SPA
lê os arquivos `data/status.json`, `data/summary.json` e `data/history.json`.

## Desenvolvimento

```bash
pnpm install
pnpm --filter @monitor-sefaz/collector collect "$PWD/apps/web/public/data"  # popular dados
pnpm --filter @monitor-sefaz/web dev    # SPA estática em http://localhost:5173

pnpm test          # todos os pacotes (Vitest)
pnpm typecheck     # checagem de tipos (project references)
pnpm lint
```

As respostas da SEFAZ são mockadas por fixtures em `packages/core/test/fixtures/`
— o CI nunca bate na SEFAZ real.

## Licença

MIT.
