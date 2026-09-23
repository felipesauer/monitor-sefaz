// @vitest-environment node
// Lê o README do disco: o URL do jsdom não serve para o fs.
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { ALL_PAGES, pagePath } from '../src/lib/pages.js';
import { DEFAULT_SITE_URL } from '../src/lib/seo.js';
import { renderReadmeUfTable, withReadmeUfTable } from '../src/lib/readme.js';

const README = readFileSync(new URL('../../../README.md', import.meta.url), 'utf8');

describe('README', () => {
  it('traz a grade de UFs em dia com o catalog', () => {
    expect(
      README,
      'README desatualizado: rode `pnpm --filter @monitor-sefaz/web readme` e commite'
    ).toBe(withReadmeUfTable(README, DEFAULT_SITE_URL));
  });

  it('só aponta para páginas do site que o prerender gera', () => {
    const built = new Set(ALL_PAGES.map((page) => `${DEFAULT_SITE_URL}${pagePath(page)}`));
    const links = [
      ...README.matchAll(/https:\/\/felipesauer\.github\.io\/monitor-sefaz\/[^\s)"'<>]*/g),
    ].map((m) => m[0]);
    expect(new Set(links).size).toBe(28);
    for (const link of links) expect(built.has(link), link).toBe(true);
  });

  it('agrupa as 27 UFs em uma coluna por região', () => {
    const table = renderReadmeUfTable(DEFAULT_SITE_URL).split('\n');
    expect(table[0]).toMatch(/^\| Norte +\| Nordeste +\| Sudeste +\| Sul +\| Centro-Oeste +\|$/);
    expect(table.join('\n').match(/\]\(https:/g)).toHaveLength(27);
  });
});
