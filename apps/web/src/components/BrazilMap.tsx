import type { ServiceStateValue } from '@monitor-sefaz/contracts';
import { STATE_META } from './serviceState.js';
import { UF_NAME } from '../lib/labels.js';
import { BR_PATHS, BR_VIEWBOX } from '../lib/brazilGeo.js';

interface BrazilMapProps {
  /** Estado agregado (pior) de cada UF. */
  ufStates: { uf: string; state: ServiceStateValue }[];
  selectedUfs: Set<string>;
  onToggleUf: (uf: string) => void;
}

/**
 * Mapa geográfico do Brasil (SVG real dos 27 estados), colorido pelo pior
 * status de cada UF e clicável para filtrar. Os paths vêm de um GeoJSON de
 * domínio público, simplificado para o tamanho do bundle.
 */
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
      <svg
        viewBox={BR_VIEWBOX}
        className="mx-auto block h-auto w-full"
        style={{ maxHeight: '60vh' }}
        role="group"
      >
        {Object.entries(BR_PATHS).map(([uf, d]) => {
          const state = stateByUf.get(uf);
          const color = state ? STATE_META[state].color : 'var(--err)';
          const active = selectedUfs.has(uf);
          const dimmed = hasSelection && !active;
          return (
            <path
              key={uf}
              d={d}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              aria-label={`${UF_NAME[uf] ?? uf}${state ? ` — ${STATE_META[state].label}` : ' — sem dados'}`}
              onClick={() => onToggleUf(uf)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleUf(uf);
                }
              }}
              className="cursor-pointer outline-none transition-opacity"
              style={{
                fill: `color-mix(in srgb, ${color} ${active ? '85%' : '45%'}, transparent)`,
                stroke: active ? color : 'var(--surface)',
                strokeWidth: active ? 1.6 : 0.8,
                opacity: dimmed ? 0.3 : 1,
              }}
            >
              <title>
                {`${UF_NAME[uf] ?? uf}${state ? ` — ${STATE_META[state].label}` : ' — sem dados'}`}
              </title>
            </path>
          );
        })}
      </svg>
    </section>
  );
}
