# Regras para agentes neste repositório

Monitor SEFAZ: monorepo pnpm + turbo (Node >=22.12, pnpm 10, TypeScript estrito, Vitest). Pacotes publicáveis em `packages/`
(`catalog`, `contracts`, `core`, `notifier`); aplicações em `apps/` (`api`, `collector`, `web`, `worker`). Cada regra abaixo diz
onde o repositório a impõe; "(sem check)" quer dizer que nada a verifica além da revisão.

## Comandos (da raiz)

- Instalar: `pnpm install --frozen-lockfile` (o CI usa exatamente isso).
- Antes de commitar, nesta ordem: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`. O CI (`.github/workflows/ci.yml`,
  job `verify`) roda esses quatro, em Node 22, em todo PR e push para `main`.
- Aplicar a formatação: `pnpm format` (Prettier, `.prettierrc.json`: aspas simples, `;`, 100 colunas, 2 espaços, `trailingComma: es5`; vale o Prettier, não o "4 espaços" do `CONTRIBUTING.md`).
- Um pacote só: `pnpm --filter @monitor-sefaz/<nome> test` (ou `typecheck`, `lint`). Vale durante o trabalho; o portão final é o da raiz.
- O `build`, o `typecheck` e o `test` dependem do build das libs (`turbo.json`, `dependsOn: ["^build"]`): o turbo cuida da ordem, não rode
  `tsc` ou `vitest` solto esperando o mesmo resultado.

## Regras

1. **Formatação**: todo arquivo `ts, tsx, js, json, md` passa em `pnpm format:check`. Check: passo "Formatação" do CI.
2. **Lint**: `pnpm lint` sem erros (`eslint.config.js`). Duas regras que pegam código novo: `@typescript-eslint/no-unused-vars` (use o
   prefixo `_` em argumento não usado) e `explicit-member-accessibility` (todo membro de classe leva `public`/`private`/`protected`;
   só o construtor não leva `public`). Check: passo "Lint" do CI.
3. **TypeScript estrito**: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax` (`tsconfig.base.json`).
   Sem `any` desnecessário; os tipos compartilhados vêm de `@monitor-sefaz/contracts`. Check: `pnpm typecheck` (CI). O "sem `any`
   desnecessário" em si é (sem check) além do lint recomendado.
4. **Todo comportamento novo leva teste Vitest**, no formato `describe('Algo', () => { it('faz tal coisa', () => {}) })`, na pasta
   `test/` do pacote (`include: ['test/**/*.test.ts']`; na web, `test/**/*.test.{ts,tsx}`). Check: `pnpm test` (CI); a exigência de haver teste é (sem check): não há piso de cobertura.
5. **Nunca bata na SEFAZ real nos testes.** Use as fixtures em `packages/core/test/fixtures/` (carregadas por
   `packages/core/test/helpers/fixtures.ts`). (sem check): a rede só é cortada por convenção.
6. **Idioma**: código, nomes, contratos e rotas em inglês; texto de interface e documentação em português. (sem check)
7. **Camadas e extensão (Open/Closed)**: dependa de interfaces, não de implementações; estenda em vez de editar o que existe.
   - Documento novo: `EnvelopeBuilder` em `packages/core/src/envelopes/`, `ResponseParser` em `packages/core/src/parsers/`, par
     registrado na `CheckerFactory` (`packages/core/src/registry/`), com fixtures e testes. (sem check)
   - Autorizador ou endpoint: só dados, em `packages/catalog/src/endpoints.ts` e `authorizers.ts`; atualize `packages/catalog/test/`.
     Check: `pnpm test`; o `endpoint-check` semanal (`.github/workflows/endpoint-check.yml`) não bloqueia nada.
8. **README gerado**: a seção "Status por estado" do `README.md` sai do catalog. Depois de mudar o catalog, rode
   `pnpm --filter @monitor-sefaz/web readme` e commite o resultado. Check: `apps/web/test/readme.test.ts` falha se ficar desatualizado.
9. **Changeset**: mudou um pacote publicado (`packages/*`)? Rode `pnpm changeset` e escreva o resumo para quem consome o pacote. As
   apps (`api`, `collector`, `web`, `worker`) estão em `ignore` em `.changeset/config.json`. Check: o `release.yml` só versiona o que tem
   changeset; a falta do arquivo no PR é (sem check).
10. **Não mexa nos campos `main`, `types` e `exports` dos `package.json` de `packages/`**: apontam para `src/` de propósito, e o
    `publishConfig` os troca para `dist/` só ao publicar. (sem check)
11. **Commits** no estilo Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`), mensagem descritiva. Os merges são só squash (squash-only): o título da PR vira o
    commit na `main`, então segue Conventional Commits. (sem check): não há commitlint nem hook.
12. **Branch**: parta de `main` com nome descritivo (`feat/minha-mudanca`); PR para `main` seguindo `.github/pull_request_template.md`
    (o que muda, como validar, checklist). (sem check)
13. **Dados coletados**: `apps/web/public/data/` é escrito pelo workflow `collect.yml` (commit
    `chore(data): atualiza status SEFAZ [skip ci]`, de hora em hora). Não edite nem commite esses JSONs à mão. (sem check)

## Nunca

- Commitar `.env`, certificados ou credenciais (`.env` está no `.gitignore`; `.env.example` é o molde). Falha de segurança vai pelo
  `SECURITY.md`, nunca numa issue pública.
- Commitar `dist/`, `coverage/`, `.turbo/` ou `*.tsbuildinfo` (todos em `.gitignore`).
- Abrir PR com `pnpm test`, `pnpm typecheck`, `pnpm lint` ou `pnpm format:check` vermelho.

## Onde as coisas vivem

- `packages/contracts`: tipos compartilhados. `packages/catalog`: endpoints e autorizadores (só dados). `packages/core`: motor de
  coleta (consenso, parsers, envelopes SOAP, checkers). `packages/notifier`: notificações.
- `apps/collector`: coleta e `endpoint-check`; `apps/web`: dashboard (Vite, pré-render); `apps/api`; `apps/worker`: Cloudflare Worker.
- `.github/workflows/`: `ci.yml` (o portão), `collect.yml`, `deploy-pages.yml`, `deploy-worker.yml`, `drift-check.yml`, `endpoint-check.yml`, `release.yml`.
- Guia humano: `CONTRIBUTING.md`.
