import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App.js';
import { ALL_PAGES, pagePath, type Page } from './lib/pages.js';
import { pageMeta, renderHead, resolveSiteUrl, type SiteVerification } from './lib/seo.js';
import { renderRobots, renderSitemap } from './lib/sitemap.js';

/**
 * Entrada do pré-render, compilada pelo build SSR (`vite build --ssr`).
 *
 * Recebe o index.html do build do cliente e devolve os arquivos do site com o
 * HTML de cada página já renderizado, para que buscador e leitor sem JS
 * recebam o conteúdo — no navegador, o React só hidrata o que chegou. O status
 * ao vivo continua vindo por fetch depois da hidratação. A E/S (ler o template,
 * gravar em dist/) fica em scripts/prerender.js; aqui é só transformação.
 */

export interface PrerenderOptions {
  /** index.html gerado pelo `vite build`, com os marcadores abaixo. */
  template: string;
  /** URL pública do site (SITE_URL); sem ela, a do deploy oficial. */
  siteUrl?: string;
  /** Data da última mudança do conteúdo das páginas (lastmod do sitemap). */
  lastmod: string;
  /** Códigos do Search Console e do Bing Webmaster, se configurados. */
  verification?: SiteVerification;
}

export interface PrerenderedFile {
  /** Caminho relativo a dist/. */
  path: string;
  content: string;
}

const HEAD_START = '<!--app-head-->';
const HEAD_END = '<!--/app-head-->';
const BODY_SLOT = '<!--app-html-->';

function renderApp(page: Page): string {
  // Um QueryClient por render: nada do cache de uma página vaza para outra.
  const queryClient = new QueryClient();
  return renderToString(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App page={page} />
      </QueryClientProvider>
    </StrictMode>
  );
}

function fillTemplate(template: string, head: string, body: string): string {
  const start = template.indexOf(HEAD_START);
  const end = template.indexOf(HEAD_END);
  if (start === -1 || end < start || !template.includes(BODY_SLOT)) {
    throw new Error(
      `index.html sem os marcadores do prerender (${HEAD_START}…${HEAD_END} e ${BODY_SLOT})`
    );
  }
  const withHead = template.slice(0, start) + head + template.slice(end + HEAD_END.length);
  // Substituição por função: com string, um "$&" no HTML viraria o próprio marcador.
  return withHead.replace(BODY_SLOT, () => body);
}

export function prerender({
  template,
  siteUrl: rawSiteUrl,
  lastmod,
  verification,
}: PrerenderOptions): PrerenderedFile[] {
  const siteUrl = resolveSiteUrl(rawSiteUrl);
  const pages = ALL_PAGES.map((page) => ({
    path: `${pagePath(page)}index.html`,
    content: fillTemplate(
      template,
      renderHead(pageMeta(page, siteUrl, lastmod), siteUrl, verification),
      renderApp(page)
    ),
  }));
  const urls = ALL_PAGES.map((page) => `${siteUrl}${pagePath(page)}`);
  return [
    ...pages,
    { path: 'sitemap.xml', content: renderSitemap(urls, lastmod) },
    { path: 'robots.txt', content: renderRobots(siteUrl) },
  ];
}
