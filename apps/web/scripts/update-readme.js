/**
 * Reescreve a seção "Status por estado" do README a partir do catalog.
 *
 * A lógica fica em src/lib/readme.ts (TS, com enums do catalog). O Vite a
 * carrega aqui pelo mesmo pipeline do dev server, sem precisar de build.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const readmePath = fileURLToPath(new URL('../../../README.md', import.meta.url));

const server = await createServer({
  root: fileURLToPath(new URL('..', import.meta.url)),
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true, ws: false },
});

try {
  const { withReadmeUfTable } = await server.ssrLoadModule('/src/lib/readme.ts');
  const { DEFAULT_SITE_URL } = await server.ssrLoadModule('/src/lib/seo.ts');
  const current = readFileSync(readmePath, 'utf8');
  const next = withReadmeUfTable(current, DEFAULT_SITE_URL);
  if (next === current) {
    console.log('README.md: seção "Status por estado" já está em dia.');
  } else {
    writeFileSync(readmePath, next);
    console.log('README.md: seção "Status por estado" atualizada.');
  }
} finally {
  await server.close();
}
