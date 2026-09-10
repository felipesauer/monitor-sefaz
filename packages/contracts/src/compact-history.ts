import { z } from 'zod';
import {
  historyPeriodSchema,
  serviceStateSchema,
  type HistoryPointDTO,
  type ServiceStateValue,
} from './schemas.js';

/**
 * Histórico COMPACTO — o formato que o Worker acumula em KV e serve à SPA.
 *
 * Por que não reusar `historyFileSchema` (um ponto por checagem)?
 * Com a coleta de 5 em 5 minutos, 72h de janela dariam 864 pontos × 135
 * serviços = ~117 mil objetos por resposta. Como o estado praticamente não
 * muda (na série real, 5803 de 5805 pontos eram OPERATIONAL), guardar um
 * objeto por checagem é quase todo redundância.
 *
 * Então guardamos duas coisas, cada uma na resolução que o dashboard usa:
 *
 * - `segments`: run-length do ESTADO. Um segmento novo só nasce quando o
 *   estado (ou o cStat) muda. Isso preserva o instante EXATO de cada queda
 *   com a precisão da coleta — que é justamente o dado que o uptime precisa.
 * - `latency`: média da latência por bucket de 1h. O gráfico não distingue
 *   resolução mais fina que isso, e agregar corta o volume em ~12×.
 *
 * O resultado é uma resposta na casa das dezenas de KB em vez de megabytes,
 * SEM perder fidelidade no que importa (quando caiu e por quanto tempo).
 */

/** Duração de um bucket de latência (1h). */
export const LATENCY_BUCKET_MS = 60 * 60 * 1000;

/** `[inícioEpochMs, estado, cStat]` — vale até o próximo segmento. */
export const historySegmentSchema = z.tuple([
  z.number(),
  serviceStateSchema,
  z.number().nullable(),
]);
export type HistorySegment = z.infer<typeof historySegmentSchema>;

/** `[inícioDoBucketEpochMs, latênciaMédiaMs]`. */
export const latencyBucketSchema = z.tuple([z.number(), z.number()]);
export type LatencyBucket = z.infer<typeof latencyBucketSchema>;

export const compactHistorySchema = z.object({
  v: z.literal(1),
  /** Instante da última coleta incorporada. */
  updatedAt: z.string(),
  /** Início da janela retida (tudo anterior já foi podado). */
  from: z.string(),
  /** Cadência nominal da coleta (ms) — a grade usada ao expandir. */
  stepMs: z.number(),
  /** `{ "NFe:SP": [[ms, 'OPERATIONAL', 107], ...] }`, em ordem crescente. */
  segments: z.record(z.string(), z.array(historySegmentSchema)),
  /** `{ "NFe:SP": [[ms, 1517], ...] }`, em ordem crescente. */
  latency: z.record(z.string(), z.array(latencyBucketSchema)),
});
export type CompactHistoryDTO = z.infer<typeof compactHistorySchema>;

/** Resposta do endpoint `/history` ao vivo. */
export const compactHistoryResponseSchema = compactHistorySchema;

/** Uma checagem individual, antes de ser incorporada ao formato compacto. */
export interface HistoryObservation {
  readonly id: string;
  readonly state: ServiceStateValue;
  readonly cStat: number | null;
  readonly latencyMs: number;
}

/** Histórico compacto vazio, ancorado em `at`. */
export function emptyCompactHistory(at: string, stepMs: number): CompactHistoryDTO {
  return { v: 1, updatedAt: at, from: at, stepMs, segments: {}, latency: {} };
}

/**
 * Incorpora uma rodada de coleta ao histórico compacto (função pura).
 *
 * O estado só vira segmento novo quando MUDA — é isso que mantém a estrutura
 * pequena mesmo com coleta a cada 5 minutos. A latência é acumulada como média
 * móvel dentro do bucket da hora corrente, sem guardar as amostras.
 */
export function appendObservations(
  history: CompactHistoryDTO,
  observations: readonly HistoryObservation[],
  atMs: number
): CompactHistoryDTO {
  const segments: CompactHistoryDTO['segments'] = { ...history.segments };
  const latency: CompactHistoryDTO['latency'] = { ...history.latency };
  const bucketStart = Math.floor(atMs / LATENCY_BUCKET_MS) * LATENCY_BUCKET_MS;

  for (const obs of observations) {
    const prior = segments[obs.id] ?? [];
    const last = prior[prior.length - 1];
    // Segmento novo só quando o estado (ou o cStat) muda — senão o anterior
    // continua valendo e nada é gravado.
    if (!last || last[1] !== obs.state || last[2] !== obs.cStat) {
      segments[obs.id] = [...prior, [atMs, obs.state, obs.cStat]];
    }

    const buckets = latency[obs.id] ?? [];
    const lastBucket = buckets[buckets.length - 1];
    if (lastBucket && lastBucket[0] === bucketStart) {
      // Média móvel simples dentro do bucket. Não guardamos o contador: com
      // cadência fixa, ponderar 50/50 converge para a média da janela e o erro
      // é irrelevante para um gráfico de latência.
      latency[obs.id] = [
        ...buckets.slice(0, -1),
        [bucketStart, Math.round((lastBucket[1] + obs.latencyMs) / 2)],
      ];
    } else {
      latency[obs.id] = [...buckets, [bucketStart, Math.round(obs.latencyMs)]];
    }
  }

  return {
    ...history,
    updatedAt: new Date(atMs).toISOString(),
    segments,
    latency,
  };
}

/**
 * Descarta o que ficou fora da janela de retenção.
 *
 * Segmentos exigem cuidado: o último segmento ANTERIOR ao corte não pode ser
 * jogado fora, porque é ele que descreve o estado vigente no início da janela.
 * Sem isso, um serviço estável há dias apareceria como "sem dados" no começo
 * do gráfico. Nesse caso o segmento é preservado, com o início deslocado para
 * a borda da janela.
 */
export function pruneCompactHistory(
  history: CompactHistoryDTO,
  retentionMs: number
): CompactHistoryDTO {
  const cutoff = Date.parse(history.updatedAt) - retentionMs;
  const segments: CompactHistoryDTO['segments'] = {};
  const latency: CompactHistoryDTO['latency'] = {};

  for (const [id, list] of Object.entries(history.segments)) {
    const kept = list.filter((s) => s[0] >= cutoff);
    const carried = [...list].reverse().find((s) => s[0] < cutoff);
    segments[id] = carried ? [[cutoff, carried[1], carried[2]], ...kept] : kept;
  }
  for (const [id, list] of Object.entries(history.latency)) {
    latency[id] = list.filter((b) => b[0] >= cutoff);
  }

  return {
    ...history,
    from: new Date(Math.max(cutoff, Date.parse(history.from))).toISOString(),
    segments,
    latency,
  };
}

/** Estado vigente em `ms` segundo os segmentos (o último que começou antes). */
function stateAt(segments: readonly HistorySegment[], ms: number): HistorySegment | undefined {
  let found: HistorySegment | undefined;
  for (const seg of segments) {
    if (seg[0] > ms) break;
    found = seg;
  }
  return found;
}

/** Latência do bucket que contém `ms` (0 quando não há amostra na hora). */
function latencyAt(buckets: readonly LatencyBucket[], ms: number): number {
  const start = Math.floor(ms / LATENCY_BUCKET_MS) * LATENCY_BUCKET_MS;
  return buckets.find((b) => b[0] === start)?.[1] ?? 0;
}

/**
 * Expande o formato compacto de volta para pontos, numa grade regular.
 *
 * `stepMs` controla a resolução da saída: o painel de detalhe pede a cadência
 * real da coleta, enquanto os sparklines dos cards pedem algo grosso (1h) —
 * expandir 135 séries na resolução fina só para desenhar um sparkline de 60px
 * criaria centenas de milhares de objetos sem nenhum ganho visual.
 *
 * A grade regular também deixa `computeUptime` correto por construção: com
 * pontos equiespaçados, "operacionais / total" vira a fração de TEMPO no ar.
 */
export function expandCompactHistory(
  history: CompactHistoryDTO,
  id: string,
  options: { fromMs?: number; toMs?: number; stepMs?: number } = {}
): HistoryPointDTO[] {
  const segments = history.segments[id];
  if (!segments || segments.length === 0) return [];

  const step = options.stepMs ?? history.stepMs;
  const to = options.toMs ?? Date.parse(history.updatedAt);
  const from = Math.max(options.fromMs ?? Date.parse(history.from), segments[0]![0]);
  if (!Number.isFinite(step) || step <= 0 || to < from) return [];

  const buckets = history.latency[id] ?? [];
  const points: HistoryPointDTO[] = [];
  for (let ms = from; ms <= to; ms += step) {
    const seg = stateAt(segments, ms);
    if (!seg) continue;
    points.push({
      timestamp: new Date(ms).toISOString(),
      state: seg[1],
      cStat: seg[2],
      latencyMs: latencyAt(buckets, ms),
    });
  }
  return points;
}

/** Expande TODAS as séries de uma vez (sparklines), na resolução pedida. */
export function expandAllSeries(
  history: CompactHistoryDTO,
  options: { fromMs?: number; toMs?: number; stepMs?: number } = {}
): Record<string, HistoryPointDTO[]> {
  const out: Record<string, HistoryPointDTO[]> = {};
  for (const id of Object.keys(history.segments)) {
    out[id] = expandCompactHistory(history, id, options);
  }
  return out;
}

/** Janela (ms) de cada período suportado. */
export const PERIOD_MS: Record<z.infer<typeof historyPeriodSchema>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '72h': 72 * 60 * 60 * 1000,
};
