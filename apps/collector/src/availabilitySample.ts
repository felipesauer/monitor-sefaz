import { createHash } from 'node:crypto';
import type { SvrsAuthorizerStatus, SvrsWebService } from '@monitor-sefaz/core';

/**
 * Amostragem das páginas de disponibilidade do SVRS, para o estudo de entrada de
 * documentos novos (NF3e, NFCom). Só lógica pura: o executor faz a rede e chama
 * daqui. A amostragem existe para responder, antes de um documento entrar no
 * monitor, se a página dele é estável o bastante para ser fonte.
 */

/**
 * Critério de entrada (ADR-21): fetch ok em pelo menos 98% das amostras, sem
 * mudança de layout. Era 99%, e com ~55 amostras por janela um único timeout
 * já reprovava o documento.
 */
export const MIN_FETCH_OK_RATIO = 0.98;

type State = SvrsWebService['state'];

/** Uma leitura de uma página numa rodada. */
export interface PageSample {
  readonly page: string;
  readonly at: string;
  readonly httpStatus: number | null;
  readonly latencyMs: number;
  readonly bytes: number;
  readonly error: string | null;
  /** Assinatura da estrutura (autorizadores e operações), ou null se nada foi lido. */
  readonly layoutHash: string | null;
  /** Por autorizador: o estado agregado (pior caso) e o do "WS Status". */
  readonly authorizers: readonly {
    readonly authorizer: string;
    readonly aggregate: State;
    readonly status: State | null;
  }[];
  readonly webServices: readonly {
    readonly authorizer: string;
    readonly operation: string;
    readonly state: State;
    readonly cStat: number | null;
  }[];
}

/** Resultado cru de um fetch, antes do parse. */
export interface FetchOutcome {
  readonly httpStatus: number | null;
  readonly latencyMs: number;
  readonly bytes: number;
  readonly error: string | null;
}

const STATUS_OP_RE = /\bWS\s+Status\b/i;

/**
 * Assinatura da estrutura da página: quais autorizadores e quais operações ela
 * lista, sem estados nem horários. Muda só quando o SVRS muda o layout.
 */
export function layoutHash(authorizers: readonly SvrsAuthorizerStatus[]): string | null {
  if (authorizers.length === 0) return null;
  const shape = authorizers
    .map((a) => `${a.authorizer}:${a.webServices.map((w) => w.operation).join('|')}`)
    .join(';');
  return createHash('sha1').update(shape).digest('hex').slice(0, 12);
}

/** Monta a amostra de uma página a partir do fetch e do que o parser leu. */
export function toPageSample(
  page: string,
  at: string,
  fetched: FetchOutcome,
  authorizers: readonly SvrsAuthorizerStatus[]
): PageSample {
  return {
    page,
    at,
    ...fetched,
    layoutHash: layoutHash(authorizers),
    authorizers: authorizers.map((a) => ({
      authorizer: a.authorizer,
      aggregate: a.state,
      status: a.webServices.find((w) => STATUS_OP_RE.test(w.operation))?.state ?? null,
    })),
    webServices: authorizers.flatMap((a) =>
      a.webServices.map((w) => ({
        authorizer: a.authorizer,
        operation: w.operation,
        state: w.state,
        cStat: w.cStat,
      }))
    ),
  };
}

/** Uma amostra só conta como ok se a página veio (HTTP 200) e o parser leu algo. */
export function isFetchOk(s: PageSample): boolean {
  return s.httpStatus === 200 && s.layoutHash !== null;
}

/**
 * A amostra diverge quando o estado agregado de algum autorizador difere do
 * estado do "WS Status": é a falha parcial que o painel esconde hoje.
 */
export function isDivergent(s: PageSample): boolean {
  return s.authorizers.some((a) => a.status !== null && a.aggregate !== a.status);
}

export interface PageSummary {
  readonly page: string;
  readonly samples: number;
  readonly fetchOk: number;
  readonly fetchOkRatio: number;
  readonly medianLatencyMs: number | null;
  readonly layouts: number;
  readonly layoutChanges: number;
  readonly divergentSamples: number;
  /** Trechos de 2 ou mais amostras divergentes seguidas. */
  readonly divergenceEpisodes: number;
  readonly meetsCriterion: boolean;
}

/** Resume as amostras de UMA página, na ordem em que foram coletadas. */
export function summarizePage(
  page: string,
  samples: readonly PageSample[],
  minOkRatio = MIN_FETCH_OK_RATIO
): PageSummary {
  const ok = samples.filter(isFetchOk);
  const latencies = ok.map((s) => s.latencyMs).sort((a, b) => a - b);

  const hashes = ok.map((s) => s.layoutHash);
  let layoutChanges = 0;
  for (let i = 1; i < hashes.length; i += 1) {
    if (hashes[i] !== hashes[i - 1]) layoutChanges += 1;
  }

  let divergentSamples = 0;
  let divergenceEpisodes = 0;
  let run = 0;
  for (const s of ok) {
    if (isDivergent(s)) {
      divergentSamples += 1;
      run += 1;
      if (run === 2) divergenceEpisodes += 1;
    } else {
      run = 0;
    }
  }

  const fetchOkRatio = samples.length === 0 ? 0 : ok.length / samples.length;
  return {
    page,
    samples: samples.length,
    fetchOk: ok.length,
    fetchOkRatio,
    medianLatencyMs: latencies.length === 0 ? null : latencies[Math.floor(latencies.length / 2)]!,
    layouts: new Set(hashes).size,
    layoutChanges,
    divergentSamples,
    divergenceEpisodes,
    meetsCriterion: samples.length > 0 && fetchOkRatio >= minOkRatio && layoutChanges === 0,
  };
}

/** Resume todas as páginas, na ordem em que aparecem nas amostras. */
export function summarize(samples: readonly PageSample[]): PageSummary[] {
  const byPage = new Map<string, PageSample[]>();
  for (const s of samples) {
    byPage.set(s.page, [...(byPage.get(s.page) ?? []), s]);
  }
  return [...byPage.entries()].map(([page, list]) => summarizePage(page, list));
}

/** Tabela em Markdown para o resumo do job no Actions. */
export function formatSummary(summaries: readonly PageSummary[]): string {
  const pct = (n: number): string => `${(n * 100).toFixed(1)}%`;
  const lines = [
    '| Página | Amostras | Fetch ok | Latência mediana | Layouts | Mudanças de layout | Amostras divergentes | Episódios | Critério |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...summaries.map(
      (s) =>
        `| ${s.page} | ${s.samples} | ${s.fetchOk} (${pct(s.fetchOkRatio)}) | ` +
        `${s.medianLatencyMs === null ? '—' : `${s.medianLatencyMs} ms`} | ${s.layouts} | ` +
        `${s.layoutChanges} | ${s.divergentSamples} | ${s.divergenceEpisodes} | ` +
        `${s.meetsCriterion ? '✅' : '❌'} |`
    ),
  ];
  return lines.join('\n');
}
