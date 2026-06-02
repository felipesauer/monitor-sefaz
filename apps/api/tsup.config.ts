import { defineConfig } from 'tsup';

/**
 * Empacota a API num único bundle ESM, resolvendo os pacotes de workspace
 * (@monitor-sefaz/*) para dentro do artefato. Assim o runtime roda com
 * `node dist/server.js` sem depender dos paths do tsconfig.
 */
export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  bundle: true,
  clean: true,
  // Externaliza TODAS as deps de node_modules (várias são CJS com require
  // dinâmico — ex: axios→form-data, cheerio→iconv-lite→safer-buffer — e quebram
  // se embutidas em ESM). Só os pacotes internos do monorepo (que resolvem para
  // src/*.ts) são embutidos via noExternal.
  skipNodeModulesBundle: true,
  noExternal: [/@monitor-sefaz\//],
});
