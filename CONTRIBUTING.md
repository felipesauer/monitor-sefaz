# Contribuindo com o Monitor SEFAZ

Obrigado pelo interesse em contribuir. Este guia cobre o fluxo de
desenvolvimento, os padrões do projeto e como estender o monitor.

## Antes de começar

- Bugs e ideias: abra uma
  [issue](https://github.com/felipesauer/monitor-sefaz/issues) descrevendo o
  problema ou a sugestão. Para bugs, inclua passos para reproduzir.
- Mudanças grandes: abra uma issue para discutir antes de investir tempo num PR.
- Falhas de segurança: não abra issue pública — veja o [SECURITY.md](SECURITY.md).
- Participar do projeto implica seguir o [Código de Conduta](CODE_OF_CONDUCT.md).

## Ambiente

Requer Node 22.12 ou superior e pnpm.

    pnpm install

    # Gera os arquivos de status consultando as fontes públicas
    pnpm --filter @monitor-sefaz/collector collect ./apps/web/public/data

    # Sobe o dashboard em http://localhost:5173
    pnpm --filter @monitor-sefaz/web dev

## Fluxo de desenvolvimento

1. Faça um fork e crie um branch a partir da `main`:
   `git checkout -b feat/minha-mudanca`
2. Implemente a mudança com testes.
3. Garanta que tudo passa:

   ```bash
   pnpm test
   pnpm typecheck
   pnpm lint
   pnpm format        # aplica o Prettier
   ```

4. Faça commits no estilo
   [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
   `docs:`, `refactor:`, `test:`, `chore:`).
5. Abra um Pull Request para a `main` descrevendo o que mudou e por quê.

## Padrões de código

- TypeScript estrito — sem `any` desnecessário; os tipos compartilhados vêm de
  `@monitor-sefaz/contracts`.
- Classes seguindo SOLID e Clean Code. Dependa de interfaces, não de
  implementações.
- Testes com Vitest, no formato:

  ```ts
  describe('Algo', () => {
    it('faz tal coisa', () => {});
  });
  ```

- Idioma: código, nomes, contratos e rotas em inglês; textos de interface e
  documentação em português.
- Nunca bata na SEFAZ real nos testes — use as fixtures em
  `packages/core/test/fixtures/`.
- O Prettier (4 espaços, aspas simples) e o ESLint definem o estilo; rode
  `pnpm format` antes de commitar.

## Como estender

O design é Open/Closed: estender raramente exige mexer no que já existe.

### Adicionar um novo documento

O BP-e (#32) e a NFCom foram feitos assim; use-os como molde.

1. **Catálogo** (`packages/catalog/src/`): o valor novo em `DocumentType`
   (`types.ts`), o mapa UF → autorizador (`authorizers.ts`) e as URLs de
   `…StatusServico` de produção e homologação (`endpoints.ts`), com a fonte
   oficial (a "Relação de Serviços Web") num comentário. Teste em
   `packages/catalog/test/`.
2. **Consulta SOAP** (`packages/core/src/`): um `EnvelopeBuilder` em `envelopes/`,
   seguindo o schema oficial da consulta de status; um `ResponseParser` em
   `parsers/DocumentStatusParsers.ts`; o par registrado na `CheckerFactory`
   (`registry/`) e exportado em `index.ts`.
3. **Fontes públicas** (`packages/core/src/`): a página do SVRS em `SVRS_URLS`
   (`svrs/SvrsProvider.ts`) e, se o IntegraNotas publicar o documento, a rota em
   `INTEGRANOTAS_DOCUMENTS` (`integranotas/IntegraNotasProvider.ts`). O documento
   novo entra em `DOCUMENT_COLUMNS` (`availability/AvailabilityParser.ts`), que é
   exaustivo; sem página na Receita, o layout lá não se aplica.
4. **Fixtures e testes**: a página real do SVRS e o JSON real do IntegraNotas em
   `packages/core/test/fixtures/`, e a resposta SOAP; testes do envelope, do
   parser, do `SvrsParser`/`SvrsCollector` e do IntegraNotas. As contagens fixas
   (serviços do catálogo, documentos por fonte) sobem junto.
5. **Web** (`apps/web/src/`): rótulo e descrição em `lib/labels.ts`, a lista
   `DOCUMENTS` em `lib/ufFacts.ts`, o filtro em `components/FilterBar.tsx` e os
   textos que listam os documentos (`Header`, `HelpSection`, `UfPage`, `lib/seo.ts`,
   `public/site.webmanifest`).
6. **Documentação e versão**: as contagens e a lista de documentos do `README.md` e
   dos READMEs dos pacotes, `pnpm --filter @monitor-sefaz/web readme`, e um
   changeset `minor` para `catalog` e `core`.

### Adicionar ou corrigir um autorizador ou endpoint

Tudo é data-only em `@monitor-sefaz/catalog`:

- `src/endpoints.ts` — URLs dos webservices por documento, ambiente e
  autorizador.
- `src/authorizers.ts` — mapa UF para autorizador (referência:
  [nfephp-org/sped-nfe](https://github.com/nfephp-org/sped-nfe)).

Os endpoints das SEFAZ mudam sem aviso; ao corrigir uma URL, confirme que o
webservice responde e atualize os testes em `packages/catalog/test/`.

As páginas por UF do site e a seção "Status por estado" do README saem do
catalog. As páginas se atualizam no build. O README precisa ser regenerado com
`pnpm --filter @monitor-sefaz/web readme`, e um teste do web acusa quando ele
fica desatualizado.

Para conferir a lista inteira de uma vez:

    pnpm --filter @monitor-sefaz/collector endpoint-check

O check é raso de propósito — só verifica se há algo servindo naquele caminho,
já que validar o serviço exigiria certificado A1. Ele distingue "o caminho
mudou" (404/410 ou DNS que não resolve, e aí falha) de "não deu para saber"
(timeout, ou TLS exigindo certificado de cliente, que não falha). Roda semanal
no CI, sem bloquear nada.

## Publicação no npm

Os pacotes de `packages/` são publicados sob o escopo `@monitor-sefaz`. Se o
seu PR mudar algum deles, gere um changeset:

    pnpm changeset

Escolha os pacotes, o tipo de bump e escreva o resumo pensando em quem
**consome** o pacote. Detalhes em [.changeset/README.md](.changeset/README.md).

Note que `main`, `types` e `exports` dos pacotes apontam para `src/` — é o que
faz o monorepo funcionar sem build intermediário. O `publishConfig` os troca
para `dist/` só no momento do publish; não mexa nesses campos sem entender essa
distinção.

## Checklist do PR

- [ ] `pnpm test`, `pnpm typecheck` e `pnpm lint` passam
- [ ] Código formatado (`pnpm format`)
- [ ] Testes cobrindo a mudança
- [ ] Changeset (`pnpm changeset`), se mudou um pacote publicado
- [ ] Documentação e README atualizados, se aplicável
- [ ] Commits no padrão Conventional Commits

Toda contribuição é distribuída sob a [licença MIT](LICENSE) do projeto.
