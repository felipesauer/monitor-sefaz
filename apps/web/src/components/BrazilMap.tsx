import type { ServiceStateValue } from '@monitor-sefaz/contracts';
import { STATE_META } from './serviceState.js';
import { UF_NAME } from '../lib/labels.js';

interface BrazilMapProps {
  /** Estado agregado (pior) de cada UF. */
  ufStates: { uf: string; state: ServiceStateValue }[];
  selectedUfs: Set<string>;
  onToggleUf: (uf: string) => void;
}

/**
 * Mapa do Brasil em "tile grid" — cada UF é um bloco posicionado de forma
 * aproximada à sua geografia (técnica consagrada de cartograma em grade, sem
 * depender de paths SVG complexos e frágeis). Colorido pelo pior status da UF
 * e clicável para filtrar. Leitura geográfica imediata, igual ao monitorsefaz.
 *
 * Grade [linha, coluna] aproximando as regiões: Norte em cima, Sul embaixo.
 */
const GRID: Record<string, [number, number]> = {
  RR: [0, 2], AP: [0, 4],
  AM: [1, 1], PA: [1, 3], MA: [1, 4], CE: [1, 5], RN: [1, 6],
  AC: [2, 0], RO: [2, 1], TO: [2, 3], PI: [2, 4], PB: [2, 6],
  MT: [3, 2], GO: [3, 3], BA: [3, 4], PE: [3, 5], AL: [3, 6],
  MS: [4, 2], MG: [4, 3], DF: [4, 4], SE: [4, 5], ES: [4, 6],
  SP: [5, 3], RJ: [5, 4],
  PR: [6, 3],
  SC: [7, 3],
  RS: [8, 3],
};

const ROWS = 9;
const COLS = 7;

export function BrazilMap({ ufStates, selectedUfs, onToggleUf }: BrazilMapProps) {
  const stateByUf = new Map(ufStates.map((u) => [u.uf, u.state]));
  const hasSelection = selectedUfs.size > 0;

  return (
    <section
      className="rounded-xl border p-4 sm:p-5"
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
      aria-label="Mapa de disponibilidade por estado"
    >
      <h2
        className="mb-3 text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-dim)' }}
      >
        Mapa por estado
      </h2>
      <div
        className="mx-auto grid w-fit gap-1"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(2rem, 2.75rem))`,
          gridTemplateRows: `repeat(${ROWS}, minmax(2rem, 2.75rem))`,
        }}
      >
        {Object.entries(GRID).map(([uf, [row, col]]) => {
          const state = stateByUf.get(uf);
          const color = state ? STATE_META[state].color : 'var(--err)';
          const active = selectedUfs.has(uf);
          const dimmed = hasSelection && !active;
          return (
            <button
              key={uf}
              type="button"
              onClick={() => onToggleUf(uf)}
              aria-pressed={active}
              title={`${UF_NAME[uf] ?? uf}${state ? ` — ${STATE_META[state].label}` : ' — sem dados'}`}
              className="flex items-center justify-center rounded-md font-mono text-xs font-bold transition-all"
              style={{
                gridRow: row + 1,
                gridColumn: col + 1,
                background: `color-mix(in srgb, ${color} ${active ? '90%' : '20%'}, transparent)`,
                color: active ? '#fff' : 'var(--text)',
                border: `1.5px solid ${color}`,
                opacity: dimmed ? 0.35 : 1,
              }}
            >
              {uf}
            </button>
          );
        })}
      </div>
    </section>
  );
}
