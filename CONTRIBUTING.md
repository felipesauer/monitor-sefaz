# Contribuindo com o Monitor SEFAZ

Obrigado pelo interesse em contribuir. Este guia cobre o fluxo de
desenvolvimento, os padrões do projeto e como estender o monitor.

## Antes de começar

- Bugs e ideias: abra uma
  [issue](https://github.com/felipesauer/monitor-sefaz/issues) descrevendo o
  problema ou a sugestão. Para bugs, inclua passos para reproduzir.
- Mudanças grandes: abra uma issue para discutir antes de investir tempo num PR.
- Falhas de segurança: não abra issue pública — veja o [SECURITY.md](SECURITY.md).

## Ambiente

Requer Node 20 ou superior e pnpm.

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

1. Em `packages/core/src/envelopes/`, crie um `EnvelopeBuilder` (envelope SOAP).
2. Em `packages/core/src/parsers/`, crie um `ResponseParser` (nó de retorno).
3. Registre o par na `CheckerFactory` (`packages/core/src/registry/`).
4. Adicione fixtures e testes.

### Adicionar ou corrigir um autorizador ou endpoint

Tudo é data-only em `@monitor-sefaz/catalog`:

- `src/endpoints.ts` — URLs dos webservices por documento, ambiente e
  autorizador.
- `src/authorizers.ts` — mapa UF para autorizador (referência:
  [nfephp-org/sped-nfe](https://github.com/nfephp-org/sped-nfe)).

Os endpoints das SEFAZ mudam sem aviso; ao corrigir uma URL, confirme que o
webservice responde e atualize os testes em `packages/catalog/test/`.

## Checklist do PR

- [ ] `pnpm test`, `pnpm typecheck` e `pnpm lint` passam
- [ ] Código formatado (`pnpm format`)
- [ ] Testes cobrindo a mudança
- [ ] Documentação e README atualizados, se aplicável
- [ ] Commits no padrão Conventional Commits

Toda contribuição é distribuída sob a [licença MIT](LICENSE) do projeto.
