import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HistoryPointDTO } from '@monitor-sefaz/contracts';

interface LatencyChartProps {
  points: HistoryPointDTO[];
}

/** Gráfico de área (Recharts) da latência ao longo do tempo. */
export function LatencyChart({ points }: LatencyChartProps) {
  const data = points
    // tMed do IntegraNotas vem em segundos inteiros: 0 é um valor legítimo
    // (resposta rápida), não "sem dado". Incluímos os zeros para não esvaziar
    // o gráfico nas UFs que reportam tMed=0.
    .filter((p) => p.latencyMs >= 0)
    .map((p) => ({
      t: new Date(p.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      ms: p.latencyMs,
    }));

  // O significado de latencyMs depende da fonte: 'availability' é latência de
  // rede real; o resto (integranotas / ausente) é o "tempo médio" da SEFAZ.
  // Rotulamos pela fonte predominante para não anunciar a métrica errada.
  const netCount = points.filter((p) => p.source === 'availability').length;
  const isNetwork = netCount > points.length / 2;
  const label = isNetwork ? 'Latência de rede' : 'Tempo médio (SEFAZ)';

  if (data.length < 2) {
    return (
      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
        Dados insuficientes para o gráfico de latência.
      </p>
    );
  }

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="lat-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            tick={{ fontSize: 10, fill: 'var(--text-dim)' }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--text-dim)' }}
            tickLine={false}
            axisLine={false}
            width={44}
            unit="ms"
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--text-dim)' }}
            formatter={(v: number) => [`${v} ms`, label]}
          />
          <Area
            type="monotone"
            dataKey="ms"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#lat-grad)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
