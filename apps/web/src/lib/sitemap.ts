function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * robots.txt do site. Buscadores só o leem na raiz do domínio (RFC 9309): no
 * GitHub Pages de projeto, em usuario.github.io/<repo>/robots.txt, ele é
 * ignorado — o sitemap chega pelo Search Console, pelo Bing Webmaster e pelo
 * <link rel="sitemap"> das páginas. Fica aqui para quando o site for servido
 * na raiz de um domínio próprio.
 */
export function renderRobots(siteUrl: string): string {
  return [
    '# Buscadores só leem o robots.txt na raiz do domínio (RFC 9309). Num',
    '# subcaminho, como o GitHub Pages de projeto, este arquivo é ignorado; ele',
    '# passa a valer se o site for servido na raiz de um domínio próprio.',
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${siteUrl}sitemap.xml`,
    '',
  ].join('\n');
}

/**
 * sitemap.xml das páginas publicadas.
 *
 * Só `loc` e `lastmod`: `changefreq` e `priority` são ignorados pelo Google e
 * pelo Bing — e o "hourly" que havia aqui nunca descreveu o HTML, que não
 * muda a cada coleta (o status ao vivo vem por fetch).
 */
export function renderSitemap(urls: readonly string[], lastmod: string): string {
  const entries = urls.map(
    (url) =>
      `  <url>\n    <loc>${escapeXml(url)}</loc>\n    <lastmod>${escapeXml(lastmod)}</lastmod>\n  </url>`
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}
