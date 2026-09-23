function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
