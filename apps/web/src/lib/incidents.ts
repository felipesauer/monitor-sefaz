import { isUp, type HistoryPointDTO, type ServiceStateValue } from '@monitor-sefaz/contracts';
import { STATE_SEVERITY } from '../components/serviceState.js';

/** Uma ocorrência: um trecho fora do ar ou instável, de um autorizador num documento. */
export interface Incident {
  document: string;
  authorizer: string;
  ufs: string[];
  /** Pior estado lido no trecho. */
  state: ServiceStateValue;
  start: number;
  /** Primeira leitura de volta ao normal; null se ainda não voltou. */
  end: number | null;
}

/** Estados que viram ocorrência. "Sem dados" é falha da fonte, não da SEFAZ. */
const COUNTS = (s: ServiceStateValue) => !isUp(s) && s !== 'ERROR';

/** Intervalo dentro do qual dois trechos do mesmo autorizador são a mesma ocorrência. */
const MERGE_MS = 15 * 60 * 1000;

/**
 * Deriva as ocorrências do histórico: cada trecho seguido de leituras fora do
 * ar ou instáveis, de cada serviço, e depois junta os serviços do mesmo
 * autorizador e documento que caíram juntos (um SVRS fora vira uma ocorrência
 * com 16 UFs, não 16). Mais recentes primeiro.
 */
export function deriveIncidents(
  series: Record<string, readonly HistoryPointDTO[]>,
  authorizerOf: (id: string) => string | undefined,
  since: number
): Incident[] {
  const runs: Incident[] = [];
  for (const [id, points] of Object.entries(series)) {
    const [document, uf] = id.split(':') as [string, string];
    const authorizer = authorizerOf(id) ?? uf;
    const sorted = [...points]
      .map((p) => ({ t: Date.parse(p.timestamp), state: p.state }))
      .filter((p) => !Number.isNaN(p.t) && p.t >= since)
      .sort((a, b) => a.t - b.t);
    let open: Incident | null = null;
    for (const p of sorted) {
      if (COUNTS(p.state)) {
        if (!open)
          open = { document, authorizer, ufs: [uf], state: p.state, start: p.t, end: null };
        else if (STATE_SEVERITY[p.state] > STATE_SEVERITY[open.state]) open.state = p.state;
      } else if (open && isUp(p.state)) {
        open.end = p.t;
        runs.push(open);
        open = null;
      }
    }
    if (open) runs.push(open);
  }

  // Junta os trechos do mesmo autorizador e documento que se sobrepõem.
  runs.sort((a, b) => a.start - b.start);
  const merged: Incident[] = [];
  for (const run of runs) {
    const same = merged.find(
      (m) =>
        m.document === run.document &&
        m.authorizer === run.authorizer &&
        run.start <= (m.end ?? Number.POSITIVE_INFINITY) + MERGE_MS
    );
    if (!same) {
      merged.push({ ...run, ufs: [...run.ufs] });
      continue;
    }
    for (const uf of run.ufs) if (!same.ufs.includes(uf)) same.ufs.push(uf);
    if (STATE_SEVERITY[run.state] > STATE_SEVERITY[same.state]) same.state = run.state;
    same.end = same.end === null || run.end === null ? null : Math.max(same.end, run.end);
  }
  for (const m of merged) m.ufs.sort();
  return merged.sort((a, b) => (b.end ?? Infinity) - (a.end ?? Infinity) || b.start - a.start);
}
