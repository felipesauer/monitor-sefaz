import { UF_INFO } from '@monitor-sefaz/catalog';
import { pagePath } from './pages.js';
import { UFS_BY_REGION } from './ufFacts.js';

/**
 * A seção "Status por estado" do README, gerada a partir do catalog e das
 * mesmas URLs que o prerender grava — então todo link dela aponta para uma
 * página que o build gera. `pnpm --filter @monitor-sefaz/web readme` reescreve
 * o trecho entre os marcadores; um teste do web acusa quando ele fica velho.
 */

export const README_SECTION_START =
  '<!-- uf-pages:start — gerado de packages/catalog; atualize com `pnpm --filter @monitor-sefaz/web readme` -->';
export const README_SECTION_END = '<!-- uf-pages:end -->';

/**
 * Grade com uma coluna por região e um link por UF, no domínio público.
 *
 * Sai já com o alinhamento que o Prettier dá às tabelas (células completadas
 * até a largura da coluna): assim o `format:check` não reescreve o que o
 * gerador escreveu, e o teste de sincronia não briga com o formatador.
 */
export function renderReadmeUfTable(siteUrl: string): string {
  const columns = UFS_BY_REGION.map(({ region, ufs }) => [
    region,
    ...ufs.map((uf) => `[${UF_INFO[uf].nome}](${siteUrl}${pagePath({ kind: 'uf', uf })})`),
  ]);
  const widths = columns.map((cells) => Math.max(...cells.map((cell) => cell.length)));
  const height = Math.max(...columns.map((cells) => cells.length));
  const row = (cells: string[]): string =>
    `| ${cells.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join(' | ')} |`;

  return [
    row(columns.map((cells) => cells[0] ?? '')),
    `| ${widths.map((w) => '-'.repeat(w)).join(' | ')} |`,
    ...Array.from({ length: height - 1 }, (_, i) =>
      row(columns.map((cells) => cells[i + 1] ?? ''))
    ),
  ].join('\n');
}

/** O README com a grade trocada entre os marcadores. Falha se eles sumirem. */
export function withReadmeUfTable(readme: string, siteUrl: string): string {
  const start = readme.indexOf(README_SECTION_START);
  const end = readme.indexOf(README_SECTION_END);
  if (start === -1 || end < start) {
    throw new Error('README.md sem os marcadores da seção "Status por estado"');
  }
  return (
    readme.slice(0, start + README_SECTION_START.length) +
    `\n\n${renderReadmeUfTable(siteUrl)}\n\n` +
    readme.slice(end)
  );
}
