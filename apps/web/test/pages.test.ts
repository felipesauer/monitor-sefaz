import { describe, it, expect } from 'vitest';
import {
  ALL_PAGES,
  HOME,
  pageFromId,
  pageFromPath,
  pageHref,
  pageId,
  pagePath,
} from '../src/lib/pages.js';

describe('páginas', () => {
  it('são a home mais uma por UF', () => {
    expect(ALL_PAGES).toHaveLength(28);
    expect(new Set(ALL_PAGES.map(pagePath)).size).toBe(28);
  });

  it('usa URLs limpas no formato /sefaz-uf/', () => {
    expect(pagePath(HOME)).toBe('');
    expect(pagePath({ kind: 'uf', uf: 'SP' })).toBe('sefaz-sp/');
    expect(pageHref({ kind: 'uf', uf: 'MG' })).toBe('/sefaz-mg/');
  });

  it('ida e volta pelo data-page do HTML pré-renderizado', () => {
    for (const page of ALL_PAGES) {
      expect(pageFromId(pageId(page))).toEqual(page);
    }
    expect(pageFromId('sefaz-xx')).toBeNull();
    expect(pageFromId('')).toBeNull();
  });

  it('resolve a página pelo caminho, com ou sem base e barra final', () => {
    expect(pageFromPath('/monitor-sefaz/sefaz-rs/', '/monitor-sefaz/')).toEqual({
      kind: 'uf',
      uf: 'RS',
    });
    expect(pageFromPath('/sefaz-rs', '/')).toEqual({ kind: 'uf', uf: 'RS' });
    expect(pageFromPath('/sefaz-rs/index.html', '/')).toEqual({ kind: 'uf', uf: 'RS' });
    expect(pageFromPath('/monitor-sefaz/', '/monitor-sefaz/')).toEqual(HOME);
    expect(pageFromPath('/sefaz-xx/', '/')).toEqual(HOME);
  });
});
