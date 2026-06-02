import type { HistoryPointDTO } from '@monitor-sefaz/contracts';

interface LatencyChartProps {
  points: HistoryPointDTO[];
}

const WIDTH = 600;
const HEIGHT = 120;
const PADDING = 4;

/** Gráfico de linha simples (SVG) da latência ao longo do tempo. */
export function LatencyChart({ points }: LatencyChartProps) {
  const operational = points.filter((p) => p.latencyMs > 0);
  if (operational.length < 2) {
    return <p className="empty">Dados insuficientes para o gráfico de latência.</p>;
  }

  const max = Math.max(...operational.map((p) => p.latencyMs));
  const stepX = (WIDTH - PADDING * 2) / (operational.length - 1);

  const path = operational
    .map((point, index) => {
      const x = PADDING + index * stepX;
      const y = HEIGHT - PADDING - (point.latencyMs / max) * (HEIGHT - PADDING * 2);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      className="latency-chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Latência ao longo do tempo, máximo ${max}ms`}
    >
      <path d={path} fill="none" stroke="#38bdf8" strokeWidth={2} />
    </svg>
  );
}
