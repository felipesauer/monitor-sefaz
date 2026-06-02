<div align="center">

# 📡 Monitor SEFAZ

**Status em tempo real dos webservices da SEFAZ — NF-e, NFC-e, CT-e, MDF-e e DC-e, por UF.**

[![Site](https://img.shields.io/badge/site-online-22c55e?style=flat-square)](https://felipesauer.github.io/monitor-sefaz/)
[![License: MIT](https://img.shields.io/badge/license-MIT-4f46e5?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Deploy](https://img.shields.io/badge/GitHub%20Pages-deploy-181717?style=flat-square&logo=github)](https://felipesauer.github.io/monitor-sefaz/)

[**🌐 Acessar o monitor →**](https://felipesauer.github.io/monitor-sefaz/)

</div>

---

Monitor open-source de disponibilidade dos serviços de documentos fiscais
eletrônicos brasileiros. Coleta o status de cada autorizador da **página oficial
de disponibilidade da SEFAZ** (pública, **sem certificado digital**), classifica
o resultado e exibe num dashboard limpo, com tema claro/escuro e histórico de
uptime — inspirado no [monitorsefaz.com.br](https://monitorsefaz.com.br).

## 🎯 Para quem é

- **Quem emite nota fiscal** e precisa saber, num relance, se a SEFAZ do seu
  estado está no ar antes de transmitir.
- **Times de TI / ERPs** que querem um painel de disponibilidade próprio,
  self-hosted ou estático, sem depender de serviços de terceiros.
- **Desenvolvedores** que precisam de um motor TypeScript reutilizável para
  consultar o status dos webservices da SEFAZ.

## 📋 O que ele monitora

Os **5 documentos fiscais eletrônicos**, nas **27 UFs**, resolvendo automaticamente
qual autorizador atende cada estado (próprio, SVRS, SVAN…):

| Documento | Descrição |
| --------- | --------- |
| 🧾 **NF-e**  | Nota Fiscal Eletrônica (modelo 55) |
| 🛒 **NFC-e** | Nota Fiscal de Consumidor Eletrônica (modelo 65) |
| 🚚 **CT-e**  | Conhecimento de Transporte Eletrônico |
| 📦 **MDF-e** | Manifesto Eletrônico de Documentos Fiscais |
| 📄 **DC-e**  | Declaração de Conteúdo eletrônica |

### Estados

| cStat | Estado | Cor |
| ----- | ------ | --- |
| 107 | Operacional | 🟢 verde |
| 108 | Instável | 🟡 amarelo |
| 109 | Indisponível | 🔴 vermelho |
| — | Sem dados | ⚪ cinza |

## 🚀 Como usar

A forma mais simples é abrir o site:

### 🌐 **[felipesauer.github.io/monitor-sefaz](https://felipesauer.github.io/monitor-sefaz/)**

Os dados são atualizados automaticamente a cada 15 minutos por um GitHub Actions.
Clique em qualquer serviço para ver o histórico de uptime e latência.

## ⚙️ Rodando localmente

Requer **Node 20+** e **pnpm**.

```bash
pnpm install

# Gera os dados de status (consulta a SEFAZ real)
pnpm --filter @monitor-sefaz/collector collect "$PWD/apps/web/public/data"

# Sobe o dashboard em http://localhost:5173
pnpm --filter @monitor-sefaz/web dev
```

### 📦 Três modos de deploy

O mesmo motor de coleta (`@monitor-sefaz/core`) alimenta três formas de rodar:

| Modo | Como funciona | Infra |
| ---- | ------------- | ----- |
| **SPA estática** (GitHub Pages) | Um GitHub Actions coleta e commita JSONs; a SPA só os lê | Nenhuma |
| **Cloudflare Worker** | Worker faz o scraping ao vivo com CORS; SPA consome | Serverless |
| **Self-host** | API Fastify + Redis + scheduler, servindo o dashboard | Docker |

```bash
# Self-host completo (API + Redis + dashboard)
docker compose up --build       # http://localhost:3333

# Cloudflare Worker (requer `wrangler login`)
pnpm --filter @monitor-sefaz/worker deploy
```

### 🔧 Scripts

| Comando | Descrição |
| ------- | --------- |
| `pnpm dev` | Sobe os apps em modo desenvolvimento |
| `pnpm build` | Builda todos os pacotes/apps |
| `pnpm test` | Roda os testes (Vitest) |
| `pnpm typecheck` | Checagem de tipos (project references) |
| `pnpm lint` | ESLint |
| `pnpm --filter @monitor-sefaz/collector collect <dir>` | Gera `status.json` / `summary.json` / `history.json` |

### 🔐 Variáveis de ambiente

Veja [`.env.example`](.env.example). As principais:

| Variável | Padrão | Uso |
| -------- | ------ | --- |
| `VITE_API_BASE_URL` | _(vazio)_ | Front: definido → API/Worker ao vivo; vazio → JSONs estáticos |
| `STATUS_SOURCE` | `availability` | Self-host: `availability` (scraping) ou `soap` |
| `REDIS_URL` | `redis://localhost:6379` | Self-host |
| `SEFAZ_CERT_PATH` / `SEFAZ_CERT_PASSPHRASE` | _(vazio)_ | Certificado A1 para o modo `soap` (mTLS) |

## 🏗️ Arquitetura

Monorepo TypeScript (**pnpm + Turborepo**), em classes seguindo SOLID e Clean
Code. Interface em PT-BR; código, contratos e APIs em inglês.

```
packages/
  catalog/     dados do MOC: UFs, cStat, endpoints e mapa UF→autorizador
  core/        motor: AvailabilityCollector (scraping) + SOAP (Envelope/Parser/Checker)
  contracts/   schemas Zod + DTOs compartilhados (single source of truth)
apps/
  collector/   CLI → gera os JSONs versionados (usado pelo GitHub Actions)
  worker/      Cloudflare Worker → scraping ao vivo com CORS
  api/         Fastify self-host → scheduler + REST + SSE + Redis
  web/         React + Vite → status page (fonte de dados plugável)
```

> **Como obtém os dados sem certificado:** a SEFAZ publica uma página oficial de
> disponibilidade (`disponibilidade.aspx`), pública e sem mTLS. O monitor faz o
> scraping dela — a mesma estratégia de monitores públicos. MDF-e e DC-e são
> centralizados no SVRS, então derivam do estado desse autorizador.

## 🧪 Testes

```bash
pnpm test
```

As respostas da SEFAZ são mockadas por fixtures em `packages/core/test/fixtures/`
— o CI **nunca** bate na SEFAZ real.

## 🤝 Contribuindo

Contribuições são bem-vindas! Veja o [CONTRIBUTING.md](CONTRIBUTING.md) para o
fluxo de desenvolvimento, padrões de código e como adicionar um novo documento
ou autorizador. Encontrou uma falha de segurança? Veja [SECURITY.md](SECURITY.md).

## 🧰 Tech Stack

**Core / Back-end:** TypeScript · Fastify · ioredis · cheerio · axios · Zod
**Front-end:** React · Vite · TanStack Query
**Infra:** pnpm · Turborepo · Vitest · Docker · Cloudflare Workers · GitHub Actions

## ❓ Perguntas frequentes

**Preciso de certificado digital A1?**
Não para o uso padrão — a fonte é a página pública de disponibilidade. O
certificado só é necessário no modo `soap` (consulta direta aos webservices).

**Os dados são em tempo real?**
No GitHub Pages, atualizam a cada 15 min (cron do Actions). Nos modos Worker e
self-host, são ao vivo / a cada checagem do scheduler.

**Posso hospedar a minha própria instância?**
Sim — em qualquer um dos três modos. Faça um fork e ajuste a URL do Pages, ou
suba via Docker / Cloudflare.

**Por que homologação não aparece?**
A página pública da SEFAZ só cobre produção. Homologação só é alcançável pelo
modo `soap` (com rede e certificado).

## 📄 Licença

[MIT](LICENSE) © Felipe Sauer

---

<div align="center">

Dados: [Portal Nacional da NF-e](https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx) ·
projeto independente, **não afiliado** à SEFAZ ou à Receita Federal.

</div>
