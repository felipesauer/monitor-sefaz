import type { HistoryFileDTO } from '@monitor-sefaz/contracts';

/**
 * Teto de tamanho do `history.json` publicado. A retenção por tempo
 * (`HISTORY_RETENTION_MS`, 7 dias) é a regra normal; o teto é a trava para a
 * coleta de 5 em 5 minutos: se o arquivo passar de `maxBytes`, os pontos mais
 * antigos saem primeiro, série a série, até caber.
 */
export const DEFAULT_HISTORY_MAX_BYTES = 2_000_000;

const sizeOf = (history: HistoryFileDTO): number => Buffer.byteLength(JSON.stringify(history));

/** Mantém só os pontos a partir de `fromMs`, descartando séries que esvaziam. */
function keepFrom(history: HistoryFileDTO, fromMs: number): HistoryFileDTO {
  const series: HistoryFileDTO['series'] = {};
  for (const [id, points] of Object.entries(history.series)) {
    const kept = points.filter((p) => Date.parse(p.timestamp) >= fromMs);
    if (kept.length > 0) series[id] = kept;
  }
  return { ...history, series };
}

/**
 * Corta o histórico pelo início até ele caber em `maxBytes`. Busca binária
 * sobre os instantes de coleta: o corte é o mais antigo que ainda cabe, então
 * o arquivo perde o mínimo de passado. Devolve o mesmo objeto
 * quando já cabe.
 */
export function capHistoryBytes(history: HistoryFileDTO, maxBytes: number): HistoryFileDTO {
  if (sizeOf(history) <= maxBytes) return history;

  const instants = [
    ...new Set(
      Object.values(history.series).flatMap((ps) => ps.map((p) => Date.parse(p.timestamp)))
    ),
  ].sort((a, b) => a - b);

  // Procura o menor índice de corte cujo resultado cabe no teto.
  let lo = 0;
  let hi = instants.length - 1;
  let best = keepFrom(history, (instants.at(-1) ?? 0) + 1);
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = keepFrom(history, instants[mid]!);
    if (sizeOf(candidate) <= maxBytes) {
      best = candidate;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return best;
}
