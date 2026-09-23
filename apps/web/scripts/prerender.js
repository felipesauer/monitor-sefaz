/**
 * Pré-render das páginas, depois do `vite build` e do build SSR.
 *
 * O que renderizar, os metadados e o sitemap ficam em src/entry-server.tsx,
 * que é tipado e testado; aqui é só a E/S: ler o index.html do build do
 * cliente, gravar as páginas em dist/ e apagar o bundle SSR, que não é
 * publicado.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Renderiza com o React de produção. O de desenvolvimento gera o mesmo HTML,
// só que mais devagar e com avisos no log do build.
process.env.NODE_ENV ??= 'production';

const webDir = fileURLToPath(new URL('..', import.meta.url));
const distDir = join(webDir, 'dist');
const ssrDir = join(webDir, 'dist-ssr');

/**
 * Data do último commit que mudou o conteúdo das páginas — o código do site e
 * os dados do catalog. É o lastmod do sitemap.
 *
 * A data do build não serve: o deploy roda a cada coleta (~4h), mas esses
 * commits só trocam os JSONs de public/data, que o HTML não embute. Um lastmod
 * que muda sem o conteúdo mudar ensina o buscador a ignorá-lo. No CI, isto
 * depende do checkout com histórico (fetch-depth: 0 no deploy-pages.yml).
 */
function contentLastModified() {
  try {
    const date = execFileSync(
      'git',
      [
        'log',
        '-1',
        '--format=%cI',
        '--',
        'src',
        'index.html',
        'scripts',
        '../../packages/catalog/src',
      ],
      { cwd: webDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    if (date) return date;
  } catch {
    // Sem git (ex.: build a partir de um tarball): cai na data do build.
  }
  return new Date().toISOString();
}

const { prerender } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);
const lastmod = contentLastModified();
const files = prerender({
  template: readFileSync(join(distDir, 'index.html'), 'utf8'),
  siteUrl: process.env.SITE_URL,
  lastmod,
});

for (const file of files) {
  const target = join(distDir, file.path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, file.content);
}
rmSync(ssrDir, { recursive: true, force: true });

console.log(`prerender: ${files.length} arquivos em dist/ (lastmod ${lastmod})`);
