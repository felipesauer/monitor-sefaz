import { useId, useState, type PointerEvent } from 'react';
import { formatTime } from '../lib/time.js';
import type { HistoryPointDTO } from '@monitor-sefaz/contracts';

interface LatencyChartProps {
  points: HistoryPointDTO[];
}

/** Proporção interna do viewBox; o SVG estica na largura do painel. */
const W = 400;
const H = 140;

/** Um intervalo maior que este múltiplo do intervalo típico é um buraco de coleta. */
const GAP_FACTOR = 3;

/** Teto "redondo" do eixo Y: 1, 2 ou 5 vezes uma potência de 10. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  return ([1, 2, 5, 10].map((m) => m * power).find((v) => v >= value) ?? 10 * power) as number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

interface Sample {
  t: number;
  ms: number;
}

/**
 * Gráfico de área da latência no tempo, em SVG puro.
 *
 * Substitui o `AreaChart` do Recharts, que custava 100 KB comprimidos para este
 * único gráfico. O eixo X é o horário real de cada leitura, não a ordem dos
 * pontos, e um intervalo muito maior que o normal quebra a linha: um buraco na
 * coleta aparece como buraco, em vez de uma reta que inventa os valores.
 */
export function LatencyChart({ points }: LatencyChartProps) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const samples: Sample[] = points
    // tMed do IntegraNotas vem em segundos inteiros: 0 é um valor legítimo
    // (resposta rápida), não "sem dado". Incluímos os zeros.
    .filter((p) => p.latencyMs >= 0)
    .map((p) => ({ t: Date.parse(p.timestamp), ms: p.latencyMs }))
    .filter((s) => !Number.isNaN(s.t))
    .sort((a, b) => a.t - b.t);

  if (samples.length < 2) {
    return (
      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
        Dados insuficientes para o gráfico de latência.
      </p>
    );
  }

  const t0 = samples[0]!.t;
  const t1 = samples[samples.length - 1]!.t;
  const span = t1 - t0 || 1;
  const values = samples.map((s) => s.ms);
  const max = niceMax(Math.max(...values));
  const x = (t: number) => ((t - t0) / span) * W;
  const y = (ms: number) => H - (ms / max) * H;

  // Quebra a série nos buracos de coleta.
  const gaps = samples.slice(1).map((s, i) => s.t - samples[i]!.t);
  const typical = median(gaps);
  const segments: Sample[][] = [[samples[0]!]];
  samples.slice(1).forEach((s, i) => {
    if (typical > 0 && gaps[i]! > typical * GAP_FACTOR) segments.push([]);
    segments[segments.length - 1]!.push(s);
  });

  const line = (seg: Sample[]) =>
    seg.map((s, i) => `${i === 0 ? 'M' : 'L'}${x(s.t).toFixed(1)} ${y(s.ms).toFixed(1)}`).join(' ');
  const area = (seg: Sample[]) =>
    `${line(seg)} L${x(seg[seg.length - 1]!.t).toFixed(1)} ${H} L${x(seg[0]!.t).toFixed(1)} ${H} Z`;

  const last = samples[samples.length - 1]!;
  const summary = `Latência de rede de ${formatTime(t0)} a ${formatTime(t1)}: mínima ${Math.min(...values)} ms, máxima ${Math.max(...values)} ms, última ${last.ms} ms.`;

  const onPointer = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0) return;
    const t = t0 + ((event.clientX - box.left) / box.width) * span;
    let nearest = 0;
    samples.forEach((s, i) => {
      if (Math.abs(s.t - t) < Math.abs(samples[nearest]!.t - t)) nearest = i;
    });
    setHover(nearest);
  };
  const focus = hover !== null ? samples[hover] : null;

  return (
    <figure className="flex flex-col gap-1">
      <div className="flex gap-2">
        <div
          className="flex h-36 w-12 shrink-0 flex-col justify-between text-right text-[10px] tabular-nums"
          style={{ color: 'var(--text-dim)' }}
          aria-hidden="true"
        >
          <span>{max} ms</span>
          <span>{max / 2} ms</span>
          <span>0</span>
        </div>
        <div className="relative h-36 min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-full w-full touch-none"
            role="img"
            aria-label={summary}
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            {[0, H / 2, H].map((gy) => (
              <line
                key={gy}
                x1={0}
                x2={W}
                y1={gy}
                y2={gy}
                stroke="var(--border)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {segments.map((seg, i) =>
              seg.length > 1 ? (
                <g key={i} data-segment={i}>
                  <path d={area(seg)} fill={`url(#${gradientId})`} />
                  <path
                    d={line(seg)}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ) : (
                <circle
                  key={i}
                  data-segment={i}
                  cx={x(seg[0]!.t)}
                  cy={y(seg[0]!.ms)}
                  r={2}
                  fill="var(--accent)"
                />
              )
            )}
            {focus && (
              <line
                x1={x(focus.t)}
                x2={x(focus.t)}
                y1={0}
                y2={H}
                stroke="var(--text-dim)"
                strokeWidth={1}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          {focus && (
            <div
              className="pointer-events-none absolute top-0 rounded-md border px-2 py-1 text-[11px] tabular-nums shadow"
              style={{
                left: `${Math.min(Math.max((x(focus.t) / W) * 100, 12), 88)}%`,
                transform: 'translateX(-50%)',
                background: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              <span style={{ color: 'var(--text-dim)' }}>{formatTime(focus.t)}</span> · {focus.ms}{' '}
              ms
            </div>
          )}
        </div>
      </div>
      <figcaption
        className="flex justify-between pl-14 text-[10px] tabular-nums"
        style={{ color: 'var(--text-dim)' }}
        aria-hidden="true"
      >
        <span>{formatTime(t0)}</span>
        <span>{formatTime(t0 + span / 2)}</span>
        <span>{formatTime(t1)}</span>
      </figcaption>
    </figure>
  );
}
