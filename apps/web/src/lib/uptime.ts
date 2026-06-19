import type { HistoryPeriod, HistoryPointDTO } from '@monitor-sefaz/contracts';

const PERIOD_MS: Record<HistoryPeriod, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '72h': 72 * 60 * 60 * 1000,
};

/** Intervalo nominal entre coletas (cron horário). Usado para estimar cobertura. */
const EXPECTED_INTERVAL_MS = 60 * 60 * 1000;

export interface UptimeStats {
  /** % de disponibilidade no período (0–100), ou null se não há pontos. */
  uptime: number | null;
  /** Pontos efetivamente coletados no período. */
  points: number;
  /** Pontos esperados se a amostragem fosse regular (cron horário). */
  expectedPoints: number;
  /** % de cobertura do período (points / expectedPoints, teto 100). */
  coverage: number;
  /** True quando a cobertura é baixa o bastante para o uptime ser pouco confiável. */
  lowCoverage: boolean;
}

/**
 * Calcula uptime e a CONFIABILIDADE dele. O uptime simples (operacionais /
 * total de pontos) engana com histórico esparso: uma falha de horas que caia
 * entre coletas não aparece. Por isso reportamos também a cobertura — quanto do
 * período foi de fato amostrado — para a UI avisar quando o número é frágil.
 */
export function computeUptime(points: HistoryPointDTO[], period: HistoryPeriod): UptimeStats {
  const total = points.length;
  if (total === 0) {
    return { uptime: null, points: 0, expectedPoints: 0, coverage: 0, lowCoverage: true };
  }
  const operational = points.filter((p) => p.state === 'OPERATIONAL').length;
  const uptime = Number(((operational / total) * 100).toFixed(1));

  const expectedPoints = Math.max(1, Math.round(PERIOD_MS[period] / EXPECTED_INTERVAL_MS));
  const coverage = Math.min(100, Math.round((total / expectedPoints) * 100));

  return {
    uptime,
    points: total,
    expectedPoints,
    coverage,
    lowCoverage: coverage < 60,
  };
}

/** Maior intervalo (ms) entre pontos consecutivos — para detectar buracos. */
export function maxGapMs(points: HistoryPointDTO[]): number {
  if (points.length < 2) return 0;
  const ts = points.map((p) => Date.parse(p.timestamp)).sort((a, b) => a - b);
  let max = 0;
  for (let i = 1; i < ts.length; i += 1) {
    max = Math.max(max, ts[i]! - ts[i - 1]!);
  }
  return max;
}
