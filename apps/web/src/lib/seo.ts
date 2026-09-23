/**
 * Metadados de cada página — title, description, canonical, Open Graph e
 * JSON-LD —, escritos no HTML pelo prerender. Ficam em código, e não no
 * index.html, para que todas as páginas saiam da mesma fonte.
 */

/** URL pública do deploy oficial. Um fork sobrescreve com SITE_URL no build. */
export const DEFAULT_SITE_URL = 'https://felipesauer.github.io/monitor-sefaz/';

/**
 * URL pública absoluta do site, sempre com barra final. Open Graph e canonical
 * NÃO aceitam caminho relativo — o crawler precisa da URL completa.
 */
export function resolveSiteUrl(raw: string | undefined): string {
  const url = raw?.trim() || DEFAULT_SITE_URL;
  return url.replace(/\/?$/, '/');
}

export interface PageMeta {
  title: string;
  description: string;
  /** URL canônica, absoluta. */
  url: string;
  ogTitle: string;
  ogDescription: string;
  twitterDescription: string;
  /** Dados estruturados (schema.org). */
  jsonLd: Record<string, unknown>;
}

export function homeMeta(siteUrl: string): PageMeta {
  const ogTitle = 'Monitor SEFAZ — a SEFAZ está fora do ar?';
  return {
    title: 'Monitor SEFAZ — Status em Tempo Real (NF-e, NFC-e, CT-e, MDF-e, DC-e)',
    description:
      'A SEFAZ está fora do ar? Veja o status em tempo real dos webservices de NF-e, NFC-e, CT-e, MDF-e e DC-e nas 27 UFs. Monitor open-source, gratuito e sem necessidade de certificado digital.',
    url: siteUrl,
    ogTitle,
    ogDescription:
      'Status em tempo real dos webservices da SEFAZ: NF-e, NFC-e, CT-e, MDF-e e DC-e nas 27 UFs. Open-source e sem certificado digital.',
    twitterDescription:
      'Status em tempo real dos webservices da SEFAZ: NF-e, NFC-e, CT-e, MDF-e e DC-e nas 27 UFs.',
    // Ajuda o buscador a entender que isto é uma ferramenta de consulta, e não
    // uma página institucional qualquer.
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Monitor SEFAZ',
      url: siteUrl,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: 'pt-BR',
      description:
        'Monitor de disponibilidade dos webservices da SEFAZ para NF-e, NFC-e, CT-e, MDF-e e DC-e nas 27 UFs.',
      license: 'https://opensource.org/licenses/MIT',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
    },
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** JSON para dentro de <script>: sem `<` cru, nenhum texto fecha a tag. */
function scriptJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Tags do <head> de uma página, na indentação do index.html. */
export function renderHead(meta: PageMeta, siteUrl: string): string {
  const image = `${siteUrl}og-image.png`;
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
    // Open Graph / Twitter: sem isto, o link compartilhado no WhatsApp ou no
    // LinkedIn aparece como texto cru, sem título, resumo ou imagem.
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Monitor SEFAZ" />',
    '<meta property="og:locale" content="pt_BR" />',
    `<meta property="og:url" content="${escapeHtml(meta.url)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.ogTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.ogDescription)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:image:alt" content="Monitor SEFAZ: 135 serviços, 27 UFs, cadência de 5 minutos." />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(meta.ogTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.twitterDescription)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    `<script type="application/ld+json">${scriptJson(meta.jsonLd)}</script>`,
  ];
  return tags.join('\n    ');
}
