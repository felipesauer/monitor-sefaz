# Changesets

Este diretório controla o versionamento e a publicação dos pacotes em
`packages/` no npm, sob o escopo `@monitor-sefaz`.

Os quatro **apps** (`api`, `collector`, `web`, `worker`) estão em `ignore`: são
deployáveis, não bibliotecas, e não vão para o registry.

## Ao abrir um PR que muda um pacote publicado

    pnpm changeset

Escolha os pacotes afetados, o tipo de bump (patch/minor/major) e escreva um
resumo em uma linha — ele vira a entrada do CHANGELOG, então descreva a
mudança para quem **consome** o pacote, não para quem revisa o diff.

Commite o arquivo `.md` gerado junto com o PR. Um PR que só mexe em app ou em
documentação não precisa de changeset.

## Ao publicar

O merge de um PR com changesets faz o workflow `release.yml` abrir (ou
atualizar) um PR "Version Packages" com os bumps e os CHANGELOGs. Fazer merge
desse PR publica no npm.

Documentação: https://github.com/changesets/changesets
