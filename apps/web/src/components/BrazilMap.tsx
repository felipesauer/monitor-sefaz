import type { CSSProperties } from 'react';
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

/** Tamanhos em unidades de viewBox (validados p/ legibilidade até ~360px de largura). */
const FONT_INTERNAL = 14;
const FONT_EXTERNAL = 12;
const DOT_R = 3.2;
const DOT_R_EXT = 3;
const HALO_W = 3; // espessura do halo (não-escalante)

/** Rótulo no centróide do estado (cabe dentro do polígono). tx,ty já incluem o recuo da bolinha. */
const INTERNAL: Record<string, { tx: number; ty: number }> = {
  AC: { tx: 58.1, ty: 241.7 },
  AM: { tx: 141, ty: 160.2 },
  AP: { tx: 324.8, ty: 70.8 },
  BA: { tx: 472.4, ty: 291.9 },
  CE: { tx: 502.8, ty: 174.6 },
  GO: { tx: 358.4, ty: 348.6 },
  MA: { tx: 421.1, ty: 174.2 },
  MG: { tx: 429.8, ty: 387 },
  MS: { tx: 283.1, ty: 416.7 },
  MT: { tx: 267.7, ty: 299.5 },
  PA: { tx: 308.8, ty: 156.9 },
  PI: { tx: 454.4, ty: 211.1 },
  PR: { tx: 329.7, ty: 485.2 },
  RO: { tx: 167.8, ty: 267.1 },
  RR: { tx: 188.6, ty: 60.6 },
  RS: { tx: 305.1, ty: 565.8 },
  SC: { tx: 345.9, ty: 526.6 },
  SP: { tx: 371.3, ty: 447.5 },
  TO: { tx: 377.1, ty: 255 },
};

/**
 * Estados pequenos/aglomerados: rótulo puxado p/ fora com leader line em cotovelo.
 * `anchor` = ponto no estado; `elbow` = dobra; `label` = posição do texto (right-aligned).
 * Coordenadas validadas contra colisão e contra os limites da viewBox (0..620 / 0..640).
 */
const EXTERNAL: Record<
  string,
  { anchor: [number, number]; elbow: [number, number]; label: [number, number] }
> = {
  RN: { anchor: [548.2, 186.5], elbow: [582, 186.5], label: [616, 185] },
  PB: { anchor: [545.9, 206.8], elbow: [582, 206.8], label: [616, 205] },
  PE: { anchor: [529.1, 226], elbow: [582, 226], label: [616, 225] },
  AL: { anchor: [549, 244.9], elbow: [582, 244.9], label: [616, 245] },
  SE: { anchor: [537.1, 261.9], elbow: [582, 261.9], label: [616, 265] },
  ES: { anchor: [490.6, 404.7], elbow: [548, 404.7], label: [576, 404.7] },
  RJ: { anchor: [461.9, 446.3], elbow: [516, 468], label: [552, 468] },
  // DF é interior (cercado por GO) e minúsculo: âncora no próprio DF e rótulo
  // puxado p/ a margem direita (vão livre acima de BA), p/ não parecer rotular GO.
  DF: { anchor: [388, 344.5], elbow: [520, 330], label: [576, 330] },
};

/** Estilo do glyph da sigla: branco com halo escuro não-escalante, legível sobre os 5 status. */
const LABEL_STYLE = {
  fill: 'var(--text)',
  stroke: 'var(--surface)',
  strokeWidth: HALO_W,
  paintOrder: 'stroke' as const,
  strokeLinejoin: 'round' as const,
  vectorEffect: 'non-scaling-stroke' as const,
  fontWeight: 700,
  letterSpacing: '0.3',
  pointerEvents: 'none' as const,
} satisfies CSSProperties;

/**
 * Mapa geográfico do Brasil (SVG real dos 27 estados), colorido pelo pior
 * status de cada UF e clicável para filtrar. Cada estado mostra um badge =
 * sigla + bolinha de status; os estados pequenos do Sudeste/Nordeste usam
 * leader lines para o rótulo ficar legível fora do polígono. Os paths vêm de
 * um GeoJSON de domínio público, simplificado para o tamanho do bundle.
 */
export function BrazilMap({ ufStates, selectedUfs, onToggleUf }: BrazilMapProps) {
  const stateByUf = new Map(ufStates.map((u) => [u.uf, u.state]));
  const hasSelection = selectedUfs.size > 0;

  const colorOf = (uf: string): string => {
    const state = stateByUf.get(uf);
    return state ? STATE_META[state].color : 'var(--err)';
  };
  const labelOf = (uf: string): string => {
    const state = stateByUf.get(uf);
    return `${UF_NAME[uf] ?? uf}${state ? ` — ${STATE_META[state].label}` : ' — sem dados'}`;
  };

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
        {/* Camada 1: polígonos clicáveis dos estados. */}
        {Object.entries(BR_PATHS).map(([uf, d]) => {
          const color = colorOf(uf);
          const active = selectedUfs.has(uf);
          const dimmed = hasSelection && !active;
          return (
            <path
              key={uf}
              d={d}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              aria-label={labelOf(uf)}
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
              <title>{labelOf(uf)}</title>
            </path>
          );
        })}

        {/* Camada 2: leader lines dos estados pequenos (atrás dos badges). */}
        {Object.entries(EXTERNAL).map(([uf, g]) => {
          if (!BR_PATHS[uf]) return null;
          const pts = `${g.anchor[0]},${g.anchor[1]} ${g.elbow[0]},${g.elbow[1]} ${g.label[0]},${g.label[1]}`;
          return (
            <polyline
              key={`lead-${uf}`}
              points={pts}
              fill="none"
              stroke="var(--text-dim)"
              strokeWidth={0.6}
              style={{ vectorEffect: 'non-scaling-stroke', pointerEvents: 'none' }}
            />
          );
        })}

        {/* Camada 3: badges internos (sigla + bolinha no centróide). */}
        {Object.entries(INTERNAL).map(([uf, p]) => {
          if (!BR_PATHS[uf]) return null;
          return (
            <g key={`in-${uf}`} style={{ pointerEvents: 'none' }} aria-hidden="true">
              <circle
                cx={p.tx - 9}
                cy={p.ty}
                r={DOT_R}
                fill={colorOf(uf)}
                stroke="var(--surface)"
                strokeWidth={1.3}
                style={{ vectorEffect: 'non-scaling-stroke' }}
              />
              <text
                x={p.tx - 3}
                y={p.ty}
                textAnchor="start"
                dominantBaseline="central"
                fontSize={FONT_INTERNAL}
                style={LABEL_STYLE}
              >
                {uf}
              </text>
            </g>
          );
        })}

        {/* Camada 4: badges externos (bolinha + sigla, alinhados à direita do rótulo). */}
        {Object.entries(EXTERNAL).map(([uf, g]) => {
          if (!BR_PATHS[uf]) return null;
          const [lx, ly] = g.label;
          // texto right-aligned em lx; bolinha à esquerda do texto (recuo p/ caber a sigla de 2 letras).
          const dotCx = lx - 19;
          return (
            <g key={`out-${uf}`} style={{ pointerEvents: 'none' }} aria-hidden="true">
              <circle
                cx={dotCx}
                cy={ly}
                r={DOT_R_EXT}
                fill={colorOf(uf)}
                stroke="var(--surface)"
                strokeWidth={1.3}
                style={{ vectorEffect: 'non-scaling-stroke' }}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={FONT_EXTERNAL}
                style={LABEL_STYLE}
              >
                {uf}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
