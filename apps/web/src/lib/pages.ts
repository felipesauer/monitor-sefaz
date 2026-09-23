import { ALL_UFS, type UF } from '@monitor-sefaz/catalog';

/** As páginas do site: o painel com todas as UFs e uma página por UF. */
export type Page = { kind: 'home' } | { kind: 'uf'; uf: UF };

export const HOME: Page = { kind: 'home' };

export const ALL_PAGES: readonly Page[] = [
  HOME,
  ...ALL_UFS.map((uf): Page => ({ kind: 'uf', uf })),
];

/**
 * Slug da página da UF: "sefaz-sp". O prefixo casa com o jeito como se busca
 * ("sefaz sp fora do ar") e evita um segmento de duas letras, que colidiria
 * com códigos de idioma (/es/, /ro/, /pa/, /ms/…) e pareceria uma versão
 * traduzida do site.
 */
export function ufSlug(uf: UF): string {
  return `sefaz-${uf.toLowerCase()}`;
}

/** Caminho da página a partir da raiz do site: "" ou "sefaz-sp/". */
export function pagePath(page: Page): string {
  return page.kind === 'home' ? '' : `${ufSlug(page.uf)}/`;
}

/** Link interno, já com o base path do build ("/monitor-sefaz/sefaz-sp/"). */
export function pageHref(page: Page): string {
  return `${import.meta.env.BASE_URL}${pagePath(page)}`;
}

/**
 * Identificador que o HTML pré-renderizado carrega em `data-page`, para o
 * cliente hidratar exatamente a página que o servidor renderizou.
 */
export function pageId(page: Page): string {
  return page.kind === 'home' ? 'home' : ufSlug(page.uf);
}

function ufFromSlug(slug: string): UF | null {
  const code = /^sefaz-([a-z]{2})$/.exec(slug)?.[1]?.toUpperCase();
  return code && (ALL_UFS as readonly string[]).includes(code) ? (code as UF) : null;
}

export function pageFromId(id: string): Page | null {
  if (id === 'home') return HOME;
  const uf = ufFromSlug(id);
  return uf ? { kind: 'uf', uf } : null;
}

/** Página a partir do caminho da URL — para o `vite dev`, que não pré-renderiza. */
export function pageFromPath(pathname: string, base: string): Page {
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.slice(1);
  const uf = ufFromSlug(rest.replace(/\/(index\.html)?$/, ''));
  return uf ? { kind: 'uf', uf } : HOME;
}
