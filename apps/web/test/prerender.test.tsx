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

/**
 * Conteúdo de um arquivo gerado, sem os `<!-- -->` que o React põe entre nós de
 * texto vizinhos ("Status da <!-- -->SEFAZ-SP"). Crawlers ignoram comentários;
 * tirá-los deixa as asserções sobre o texto como o leitor o vê.
 */
function file(files: ReturnType<typeof prerender>, path: string): string {
  const found = files.find((f) => f.path === path);
  if (!found) throw new Error(`prerender não gerou ${path}`);
  return found.content.replaceAll('<!-- -->', '');
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

  it('gera uma página por UF', () => {
    const pages = files.filter((f) => f.path.endsWith('index.html')).map((f) => f.path);
    expect(pages).toHaveLength(28);
    expect(pages).toContain('sefaz-sp/index.html');
    expect(pages).toContain('sefaz-to/index.html');
  });

  it('põe metadados próprios na página da UF', () => {
    const html = file(files, 'sefaz-mg/index.html');
    expect(html).toContain('<title>SEFAZ-MG fora do ar ou instável? Status da NF-e hoje</title>');
    expect(html).toContain(
      '<link rel="canonical" href="https://exemplo.com.br/monitor/sefaz-mg/" />'
    );
    expect(html).toContain(
      '<meta property="og:url" content="https://exemplo.com.br/monitor/sefaz-mg/" />'
    );
    expect(html).toContain('"@type":"BreadcrumbList"');
  });

  it('entrega o conteúdo da UF no HTML, sem depender de JS', () => {
    const html = file(files, 'sefaz-sp/index.html');
    expect(html).toContain('data-page="sefaz-sp"');
    expect(html).toContain('Status da SEFAZ-SP agora');
    expect(html).toContain('Quem autoriza os documentos fiscais de São Paulo');
    expect(html).toContain('Autorizador próprio do estado');
    expect(html).toContain('A NF-e de São Paulo é autorizada pela própria SEFAZ-SP');
    expect(html).toContain('Na NF-e, a contingência de São Paulo é o SVC-AN.');
    expect(html).toContain('O que fazer quando a SEFAZ-SP cai');
    expect(html).toContain('Carregando o status ao vivo…');
  });

  it('diz quem cai junto quando o autorizador é compartilhado', () => {
    const html = file(files, 'sefaz-ac/index.html');
    expect(html).toContain('A NF-e do Acre é autorizada pelo');
    expect(html).toContain('Sefaz Virtual do Rio Grande do Sul');
    expect(html).toContain('href="/sefaz-to/"');
    const ma = file(files, 'sefaz-ma/index.html');
    expect(ma).toContain('A NF-e do Maranhão é autorizada pelo');
    expect(ma).toContain('que não atende outros estados');
    expect(ma).toContain('Na NF-e, a contingência do Maranhão é o SVC-RS.');
  });

  it('liga cada página às outras 26 UFs, sem link para si mesma', () => {
    const html = file(files, 'sefaz-rs/index.html');
    const links = new Set(html.match(/href="\/sefaz-[a-z]{2}\/"/g));
    expect(links.has('href="/sefaz-rs/"')).toBe(false);
    expect(links.size).toBe(26);
    expect(html).toContain('aria-current="page"');
  });

  it('põe o botão de estrela no header de todas as páginas', () => {
    for (const path of ['index.html', 'sefaz-sp/index.html', 'sefaz-am/index.html']) {
      const html = file(files, path);
      expect(html).toContain('href="https://github.com/felipesauer/monitor-sefaz" target="_blank"');
      expect(html).toContain('Star no GitHub');
    }
  });

  it('liga a home às 27 páginas por UF', () => {
    const html = file(files, 'index.html');
    expect(new Set(html.match(/href="\/sefaz-[a-z]{2}\/"/g)).size).toBe(27);
  });

  it('gera o sitemap com todas as páginas e lastmod', () => {
    const sitemap = file(files, 'sitemap.xml');
    expect(sitemap.match(/<url>/g)).toHaveLength(28);
    expect(sitemap).toContain('<loc>https://exemplo.com.br/monitor/</loc>');
    expect(sitemap).toContain('<loc>https://exemplo.com.br/monitor/sefaz-sp/</loc>');
    expect(sitemap.match(new RegExp(`<lastmod>${LASTMOD}</lastmod>`, 'g'))).toHaveLength(28);
  });

  it('gera o robots.txt com o sitemap da URL pública', () => {
    const robots = file(files, 'robots.txt');
    expect(robots).toContain('Sitemap: https://exemplo.com.br/monitor/sitemap.xml');
    expect(robots).toContain('User-agent: *');
  });

  it('põe as tags de verificação em todas as páginas quando configuradas', () => {
    const verified = prerender({
      template: TEMPLATE,
      lastmod: LASTMOD,
      verification: { google: '<meta name="google-site-verification" content="g-123" />' },
    });
    const pages = verified.filter((f) => f.path.endsWith('index.html'));
    expect(pages).toHaveLength(28);
    for (const page of pages) {
      expect(page.content).toContain('<meta name="google-site-verification" content="g-123" />');
    }
    expect(file(files, 'index.html')).not.toContain('google-site-verification');
  });

  it('grava o arquivo de verificação do Google quando é esse o método', () => {
    const verified = prerender({
      template: TEMPLATE,
      lastmod: LASTMOD,
      verification: { google: 'google0123456789abcdef.html' },
    });
    expect(file(verified, 'google0123456789abcdef.html')).toBe(
      'google-site-verification: google0123456789abcdef.html'
    );
    expect(file(verified, 'index.html')).not.toContain('google-site-verification');
    expect(files.some((f) => f.path.startsWith('google'))).toBe(false);
  });

  it('falha alto se o index.html perdeu os marcadores', () => {
    expect(() => prerender({ template: '<html></html>', lastmod: LASTMOD })).toThrow(
      /marcadores do prerender/
    );
  });
});
