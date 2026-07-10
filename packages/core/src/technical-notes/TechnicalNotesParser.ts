import * as cheerio from 'cheerio';

/** Uma Nota Técnica publicada no portal (lista de conteúdo). */
export interface TechnicalNote {
  /** Título exibido (texto do span.tituloConteudo). */
  readonly title: string;
  /** Link relativo/absoluto para o conteúdo, quando presente. */
  readonly link: string | null;
}

const PORTAL_BASE = 'https://www.nfe.fazenda.gov.br/portal/';

/** Normaliza um href relativo do portal para URL absoluta; mantém http(s) como está. */
function absolutize(href: string | undefined): string | null {
  if (!href) return null;
  const clean = href.trim().replace(/\s/g, '');
  if (!clean) return null;
  if (/^https?:\/\//i.test(clean)) return clean;
  return `${PORTAL_BASE}${clean.replace(/^\/+/, '')}`;
}

/**
 * Parser da lista de Notas Técnicas do portal da NF-e
 * (`listaConteudo.aspx?tipoConteudo=...`). Cada item é um `<span class="tituloConteudo">`
 * dentro de um `<a>`; o link é o `href` desse âncora.
 *
 * Correções sobre monitores ingênuos: extrai TODAS as notas da página (não só a
 * primeira) e PERSISTE o link. Função pura, testável por fixture.
 */
export function parseTechnicalNotes(html: string): TechnicalNote[] {
  const $ = cheerio.load(html);
  const notes: TechnicalNote[] = [];
  const seen = new Set<string>();

  $('span.tituloConteudo').each((_, span) => {
    const $span = $(span);
    const title = $span.text().trim().replace(/\s+/g, ' ');
    if (!title) return;

    // O link é o href do <a> ancestral mais próximo (quando existe).
    const href = $span.closest('a').attr('href') ?? $span.parent('a').attr('href');
    const link = absolutize(href);

    // Dedup por título+link dentro da mesma página (evita repetição de markup).
    const key = `${title}|${link ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);

    notes.push({ title, link });
  });

  return notes;
}
