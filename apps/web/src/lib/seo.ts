import { UF_INFO, type UF } from '@monitor-sefaz/catalog';
import { inUf } from './labels.js';
import { pagePath, type Page } from './pages.js';

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

/**
 * Página de uma UF. Título e descrição miram como a busca acontece — "sefaz sp
 * fora do ar", "status nfe sefaz mg", "sefaz rs instável hoje" — e cabem no
 * que o Google exibe (~60 e ~160 caracteres).
 */
export function ufMeta(uf: UF, siteUrl: string, lastmod: string): PageMeta {
  const url = `${siteUrl}${pagePath({ kind: 'uf', uf })}`;
  const sefaz = `SEFAZ-${uf}`;
  const title = `${sefaz} fora do ar ou instável? Status da NF-e hoje`;
  const description = `A ${sefaz} está fora do ar ou instável hoje? Veja ao vivo o status de NF-e, NFC-e, CT-e, MDF-e e DC-e ${inUf(uf)} e o que fazer em contingência.`;
  return {
    title,
    description,
    url,
    ogTitle: `Status da ${sefaz} ao vivo — Monitor SEFAZ`,
    ogDescription: description,
    twitterDescription: description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': `${url}#webpage`,
          url,
          name: title,
          description,
          inLanguage: 'pt-BR',
          dateModified: lastmod,
          isPartOf: { '@type': 'WebSite', name: 'Monitor SEFAZ', url: siteUrl },
          about: {
            '@type': 'State',
            name: UF_INFO[uf].nome,
            alternateName: uf,
            containedInPlace: { '@type': 'Country', name: 'Brasil' },
          },
          breadcrumb: { '@id': `${url}#breadcrumb` },
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${url}#breadcrumb`,
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Monitor SEFAZ', item: siteUrl },
            { '@type': 'ListItem', position: 2, name: sefaz, item: url },
          ],
        },
      ],
    },
  };
}

export function pageMeta(page: Page, siteUrl: string, lastmod: string): PageMeta {
  return page.kind === 'home' ? homeMeta(siteUrl) : ufMeta(page.uf, siteUrl, lastmod);
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

/**
 * Códigos de verificação de propriedade: Google Search Console
 * (google-site-verification) e Bing Webmaster Tools (msvalidate.01).
 */
export interface SiteVerification {
  google?: string;
  bing?: string;
}

/**
 * Token de verificação a partir do que foi colado na variável de build: o
 * token puro ou a <meta> inteira, como o Search Console e o Bing a exibem.
 * Colagem sem jeito de token falha alto em vez de gerar uma tag que nunca
 * verificaria.
 */
export function verificationToken(name: string, raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const token = /content\s*=\s*["']([^"']*)["']/i.exec(value)?.[1]?.trim() ?? value;
  if (!/^[\w\-+/=.]+$/.test(token)) {
    throw new Error(`${name} não parece um código de verificação: ${JSON.stringify(raw)}`);
  }
  return token;
}

/**
 * Nome do arquivo do método "Arquivo HTML" do Search Console
 * (google1a2b3c4d5e6f7a8b.html), quando é isso que veio no lugar do código da
 * meta tag. O prerender grava o arquivo na raiz do site, e a meta tag fica de
 * fora — com esse valor ela não verificaria nada.
 */
export function googleVerificationFile(raw: string | undefined): string | null {
  const value = raw?.trim();
  return value && /^google[0-9a-f]+\.html$/i.test(value) ? value : null;
}

/** Tags do <head> de uma página, na indentação do index.html. */
export function renderHead(
  meta: PageMeta,
  siteUrl: string,
  verification: SiteVerification = {}
): string {
  const image = `${siteUrl}og-image.png`;
  const google = googleVerificationFile(verification.google)
    ? null
    : verificationToken('GOOGLE_SITE_VERIFICATION', verification.google);
  const bing = verificationToken('BING_SITE_VERIFICATION', verification.bing);
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
    // O robots.txt não serve aqui: buscador só o lê na raiz do domínio, e o
    // site mora num subcaminho do github.io. Não é padrão oficial, mas é o
    // aviso que dá para deixar em cada página.
    `<link rel="sitemap" type="application/xml" title="Sitemap" href="${escapeHtml(`${siteUrl}sitemap.xml`)}" />`,
    ...(google ? [`<meta name="google-site-verification" content="${escapeHtml(google)}" />`] : []),
    ...(bing ? [`<meta name="msvalidate.01" content="${escapeHtml(bing)}" />`] : []),
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
