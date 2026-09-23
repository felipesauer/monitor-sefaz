import { defineConfig } from 'vitest/config';

// Rodar `vitest` na raiz (ou pela extensão do editor) enxerga todos os pacotes.
// O `pnpm test` não passa por aqui: o turbo roda cada pacote na própria pasta,
// com o vitest.config.ts de lá. Substitui o vitest.workspace.ts, que o Vitest 4
// deixou de ler (defineWorkspace foi removido).
export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/api', 'apps/web', 'apps/worker', 'apps/collector'],
  },
});
