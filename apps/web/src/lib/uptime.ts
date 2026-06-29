import { isUp, type HistoryPeriod, type HistoryPointDTO } from '@monitor-sefaz/contracts';

const PERIOD_MS: Record<HistoryPeriod, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '72h': 72 * 60 * 60 * 1000,
};

/**
 * Cadência fallback (ms) quando há poucos pontos para inferir o intervalo real.
 * O cron do Actions é declarado horário mas é best-effort: na prática roda a
 * cada ~3h. Só serve de chute inicial — com ≥2 pontos usamos a mediana real.
 */
const FALLBACK_INTERVAL_MS = 3 * 60 * 60 * 1000;

export interface UptimeStats {
  /** % de disponibilidade no período (0–100), ou null se não há pontos. */
  uptime: number | null;
  /** Pontos efetivamente coletados no período. */
  points: number;
  /** Pontos esperados na cadência REAL observada (mediana dos gaps). */
  expectedPoints: number;
  /** % de cobertura do período (points / expectedPoints, teto 100). */
  coverage: number;
  /** True quando há um buraco anormal — instabilidade pode ter passado batida. */
  lowCoverage: boolean;
}

/** Mediana dos intervalos (ms) entre pontos consecutivos; 0 se < 2 pontos. */
function medianGapMs(points: HistoryPointDTO[]): number {
  if (points.length < 2) return 0;
  const ts = points.map((p) => Date.parse(p.timestamp)).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < ts.length; i += 1) gaps.push(ts[i]! - ts[i - 1]!);
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  return gaps.length % 2 === 0 ? (gaps[mid - 1]! + gaps[mid]!) / 2 : gaps[mid]!;
}

/**
 * Calcula uptime e a CONFIABILIDADE dele. O uptime simples (operacionais /
 * total de pontos) engana com histórico esparso: uma falha de horas que caia
 * entre coletas não aparece. Em vez de comparar contra um intervalo fixo
 * presumido (o cron é best-effort e roda bem menos que de hora em hora), medimos
 * a CADÊNCIA REAL pela mediana dos gaps observados e só alertamos quando há um
 * buraco anormalmente grande — aí sim uma instabilidade pode ter passado batida.
 */
export function computeUptime(points: HistoryPointDTO[], period: HistoryPeriod): UptimeStats {
  const total = points.length;
  if (total === 0) {
    return { uptime: null, points: 0, expectedPoints: 0, coverage: 0, lowCoverage: true };
  }
  const operational = points.filter((p) => isUp(p.state)).length;
  const uptime = Number(((operational / total) * 100).toFixed(1));

  // Cadência típica observada (mediana). Com 1 ponto, cai no fallback.
  const typicalGap = medianGapMs(points);
  const interval = typicalGap > 0 ? typicalGap : FALLBACK_INTERVAL_MS;
  const expectedPoints = Math.max(1, Math.round(PERIOD_MS[period] / interval));
  const coverage = Math.min(100, Math.round((total / expectedPoints) * 100));

  // Pouco confiável quando há um buraco anormal (maior gap > 2,5× a cadência
  // típica) OU quando amostramos menos da metade do período. A 2ª condição
  // cobre o caso degenerado de 0/1 ponto, em que maxGapMs é 0 e não acusaria
  // a janela inteira sem leitura.
  const lowCoverage = coverage < 50 || maxGapMs(points) > interval * 2.5;

  return {
    uptime,
    points: total,
    expectedPoints,
    coverage,
    lowCoverage,
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
