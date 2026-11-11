import type { HistoryFileDTO, HistoryPointDTO, ServiceStateValue } from '@monitor-sefaz/contracts';

/** Janela recente que fica com a resolução cheia da coleta (um ponto a cada 5 min). */
export const FULL_RESOLUTION_MS = 60 * 60 * 1000;

/** Um ponto por este intervalo no que é mais antigo que a janela recente. */
export const DOWNSAMPLE_STEP_MS = 60 * 60 * 1000;

/** Pior estado primeiro: uma queda dentro da hora não some na redução. */
const SEVERITY: Record<ServiceStateValue, number> = {
  DOWN: 4,
  SLOWDOWN: 3,
  ERROR: 2,
  CONTINGENCY: 1,
  OPERATIONAL: 0,
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Um ponto representando a hora: o de pior estado, com a latência mediana da hora. */
function summarize(points: HistoryPointDTO[]): HistoryPointDTO {
  const worst = points.reduce((w, p) => (SEVERITY[p.state] > SEVERITY[w.state] ? p : w));
  const latencies = points.map((p) => p.latencyMs).filter((v) => v >= 0);
  return {
    ...worst,
    latencyMs: latencies.length ? Math.round(median(latencies)) : worst.latencyMs,
  };
}

/**
 * Reduz o `history.json` a um ponto por hora no que é mais antigo que a última
 * hora (ADR-22). Com a coleta a cada 5 minutos, 7 dias de resolução cheia não
 * cabem no teto de tamanho; um ponto por hora cabe, e o pior estado da hora é
 * o que fica, para uma queda não sumir. A latência do ponto é a mediana da
 * hora. Rodar de novo sobre o resultado não muda nada (as horas já reduzidas
 * têm um ponto só).
 */
export function downsampleHistory(
  history: HistoryFileDTO,
  now: number,
  fullResolutionMs = FULL_RESOLUTION_MS,
  stepMs = DOWNSAMPLE_STEP_MS
): HistoryFileDTO {
  const boundary = now - fullResolutionMs;
  const series: HistoryFileDTO['series'] = {};
  for (const [id, points] of Object.entries(history.series)) {
    const recent: HistoryPointDTO[] = [];
    const hours = new Map<number, HistoryPointDTO[]>();
    for (const p of points) {
      const t = Date.parse(p.timestamp);
      if (Number.isNaN(t) || t >= boundary) {
        recent.push(p);
        continue;
      }
      const key = Math.floor(t / stepMs);
      hours.set(key, [...(hours.get(key) ?? []), p]);
    }
    const older = [...hours.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, group]) => (group.length === 1 ? group[0]! : summarize(group)));
    series[id] = [...older, ...recent];
  }
  return { ...history, series };
}
