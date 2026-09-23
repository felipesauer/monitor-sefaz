// @vitest-environment node
// Ambiente node de propósito: é onde o prerender roda no build. Um componente
// que toque em window/document/localStorage durante o render quebra aqui.
import { describe, it, expect } from 'vitest';
import { prerender } from '../src/entry-server.js';

const TEMPLATE = `<!doctype html>
<html lang="pt-BR">
  <head>
    <!--app-head--><title>Monitor SEFAZ</title><!--/app-head-->
  </head>
  <body>
    <div id="root"><!--app-html--></div>
  </body>
</html>`;

const LASTMOD = '2026-09-23T10:00:00-03:00';

function file(files: ReturnType<typeof prerender>, path: string): string {
  const found = files.find((f) => f.path === path);
  if (!found) throw new Error(`prerender não gerou ${path}`);
  return found.content;
}

describe('prerender', () => {
  const files = prerender({
    template: TEMPLATE,
    siteUrl: 'https://exemplo.com.br/monitor',
    lastmod: LASTMOD,
  });

  it('troca o bloco de metadados do template pelo da página', () => {
    const html = file(files, 'index.html');
    expect(html).not.toContain('<!--app-head-->');
    expect(html).not.toContain('<title>Monitor SEFAZ</title>');
    expect(html).toContain('<link rel="canonical" href="https://exemplo.com.br/monitor/" />');
  });

  it('entrega o conteúdo da home no HTML, sem depender de JS', () => {
    const html = file(files, 'index.html');
    expect(html).not.toContain('<!--app-html-->');
    expect(html).toContain('<h1 class="text-lg font-bold leading-tight">Monitor SEFAZ</h1>');
    expect(html).toContain('Acompanhe em tempo real a disponibilidade');
    // O status ao vivo ainda depende do fetch: no HTML vai o estado de espera.
    expect(html).toContain('Carregando…');
  });

  it('deixa os paths do mapa de fora do HTML (vêm na hidratação)', () => {
    const html = file(files, 'index.html');
    expect(html).toMatch(/<svg viewBox="0 0 620 640"[^>]*><\/svg>/);
  });

  it('gera o sitemap com lastmod', () => {
    const sitemap = file(files, 'sitemap.xml');
    expect(sitemap).toContain('<loc>https://exemplo.com.br/monitor/</loc>');
    expect(sitemap).toContain(`<lastmod>${LASTMOD}</lastmod>`);
  });

  it('falha alto se o index.html perdeu os marcadores', () => {
    expect(() => prerender({ template: '<html></html>', lastmod: LASTMOD })).toThrow(
      /marcadores do prerender/
    );
  });
});
