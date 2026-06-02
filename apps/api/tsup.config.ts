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
  // Embute apenas os pacotes internos do monorepo (resolvem para src/*.ts).
  noExternal: [/@monitor-sefaz\//],
  // Deixa as dependências de runtime fora do bundle — várias (axios→form-data→
  // combined-stream) são CJS e quebram com require dinâmico se forem embutidas.
  external: ['axios', 'fast-xml-parser', 'fastify', '@fastify/cors', '@fastify/rate-limit', '@fastify/static', 'ioredis', 'node-cron', 'zod'],
});
