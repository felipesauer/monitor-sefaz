import { useMemo, useState } from 'react';
import { formatTime } from '../lib/time.js';
import type { DocumentType } from '@monitor-sefaz/catalog';
import {
  isUp,
  PERIOD_MS,
  type HistoryPeriod,
  type HistoryPointDTO,
} from '@monitor-sefaz/contracts';
import type { HistorySeries } from '../api/DataSource.js';
import { LatencyChart } from './LatencyChart.js';
import { STATE_META } from './serviceState.js';
import { bucketTimeline, computeUptime } from '../lib/uptime.js';
import { DOC_LABEL } from '../lib/labels.js';

interface OverviewChartsProps {
  /** Todas as séries do histórico; ausente enquanto carrega. */
  series?: HistorySeries;
  documents: readonly DocumentType[];
  /** Fim da janela (ms): o horário da última coleta. */
  end?: number;
}

const PERIODS: HistoryPeriod[] = ['6h', '24h', '72h'];
const BUCKETS = 48;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Os números do panorama, calculados das séries de todos os serviços. */
function useOverview(
  series: HistorySeries | undefined,
  documents: readonly DocumentType[],
  end: number,
  period: HistoryPeriod
) {
  return useMemo(() => {
    const periodMs = PERIOD_MS[period];
    const entries = Object.entries(series ?? {});
    const byDocument = documents.map((document) => {
      const points = entries
        .filter(([id]) => id.startsWith(`${document}:`))
        .flatMap(([, pts]) => pts);
      const recent = points.filter((p) => Date.parse(p.timestamp) >= end - periodMs);
      return {
        document,
        buckets: bucketTimeline(points, end, periodMs, BUCKETS),
        uptime: computeUptime(recent, period).uptime,
      };
    });

    // Mediana do tempo de acesso e serviços com problema, por faixa de tempo.
    const size = periodMs / BUCKETS;
    const start = end - periodMs;
    const latencies: number[][] = Array.from({ length: BUCKETS }, () => []);
    const failing: Set<string>[] = Array.from({ length: BUCKETS }, () => new Set());
    for (const [id, pts] of entries) {
      for (const p of pts) {
        const t = Date.parse(p.timestamp);
        if (Number.isNaN(t) || t < start || t > end) continue;
        const i = Math.min(BUCKETS - 1, Math.floor((t - start) / size));
        if (p.latencyMs >= 0) latencies[i]!.push(p.latencyMs);
        if (!isUp(p.state)) failing[i]!.add(id);
      }
    }
    const latencyPoints: HistoryPointDTO[] = latencies.flatMap((values, i) =>
      values.length
        ? [
            {
              timestamp: new Date(start + (i + 0.5) * size).toISOString(),
              state: 'OPERATIONAL' as const,
              cStat: null,
              latencyMs: Math.round(median(values)),
            },
          ]
        : []
    );
    const problems = failing.map((set, i) => ({ start: start + i * size, count: set.size }));
    return { byDocument, latencyPoints, problems, start };
  }, [series, documents, end, period]);
}

/**
 * Panorama da janela: o estado de cada documento no tempo (pior estado entre
 * as UFs, por faixa), a mediana do tempo de acesso e quantos serviços tiveram
 * problema. O bloco tem a mesma altura carregando ou não (sem salto de layout).
 */
export function OverviewCharts({ series, documents, end = Date.now() }: OverviewChartsProps) {
  const [period, setPeriod] = useState<HistoryPeriod>('24h');
  const { byDocument, latencyPoints, problems, start } = useOverview(
    series,
    documents,
    end,
    period
  );
  const loading = !series;
  const maxProblems = Math.max(0, ...problems.map((p) => p.count));

  return (
    <section
      className="flex flex-col gap-5 rounded-xl border p-4 sm:p-5"
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
      aria-labelledby="panorama-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="panorama-title" className="text-sm font-semibold">
            Panorama
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            {loading
              ? 'Carregando o histórico…'
              : `De ${formatTime(start)} até a última coleta, ${formatTime(end)} (horário de Brasília)`}
          </p>
        </div>
        <div
          className="flex gap-1 rounded-lg p-0.5"
          style={{ background: 'var(--surface-2)' }}
          role="group"
          aria-label="Período do panorama"
        >
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
              className="rounded-md px-3 py-1 text-xs font-semibold transition-colors"
              style={
                period === p
                  ? {
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      boxShadow: 'var(--shadow)',
                    }
                  : { color: 'var(--text-dim)' }
              }
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>
            Estado de cada documento no período (pior estado entre as UFs)
          </h3>
          <table className="w-full border-separate" style={{ borderSpacing: '0 6px' }}>
            <thead className="sr-only">
              <tr>
                <th scope="col">Documento</th>
                <th scope="col">Linha do tempo</th>
                <th scope="col">Disponibilidade</th>
              </tr>
            </thead>
            <tbody>
              {byDocument.map(({ document, buckets, uptime }) => (
                <tr key={document}>
                  <th scope="row" className="w-14 pr-2 text-left text-xs font-semibold">
                    {DOC_LABEL[document] ?? document}
                  </th>
                  <td className="p-0">
                    <div
                      className="flex h-6 gap-[2px]"
                      role="img"
                      aria-label={`${DOC_LABEL[document] ?? document}: ${buckets.filter((b) => b.state && !isUp(b.state)).length} faixas com problema`}
                    >
                      {buckets.map((b, i) => (
                        <span
                          key={i}
                          className="min-w-0 flex-1 rounded-[2px]"
                          title={
                            loading
                              ? undefined
                              : `${formatTime(b.start)}–${formatTime(b.end)} · ${b.state ? STATE_META[b.state].label : 'sem leitura'}`
                          }
                          style={
                            loading
                              ? { background: 'var(--surface-2)' }
                              : b.state
                                ? { background: STATE_META[b.state].color }
                                : {
                                    background:
                                      'repeating-linear-gradient(135deg, var(--surface-2) 0 3px, var(--border) 3px 4px)',
                                  }
                          }
                        />
                      ))}
                    </div>
                  </td>
                  <td className="w-16 pl-2 text-right font-mono text-xs font-semibold tabular-nums">
                    {loading || uptime === null ? '—' : `${uptime}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul
            className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]"
            style={{ color: 'var(--text-dim)' }}
            aria-label="Legenda"
          >
            {(['OPERATIONAL', 'CONTINGENCY', 'SLOWDOWN', 'DOWN', 'ERROR'] as const).map((state) => (
              <li key={state} className="flex items-center gap-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-[2px]"
                  style={{ background: STATE_META[state].color }}
                  aria-hidden="true"
                />
                {STATE_META[state].label}
              </li>
            ))}
            <li className="flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-[2px]"
                style={{
                  background:
                    'repeating-linear-gradient(135deg, var(--surface-2) 0 3px, var(--border) 3px 4px)',
                }}
                aria-hidden="true"
              />
              Sem leitura
            </li>
            <li>· cada faixa: {Math.round(PERIOD_MS[period] / BUCKETS / 60_000)} min</li>
          </ul>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div>
            <h3 className="mb-2 text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>
              Tempo de acesso às fontes (mediana de todos os serviços)
            </h3>
            {loading ? (
              <div
                className="h-[164px] animate-pulse rounded"
                style={{ background: 'var(--surface-2)' }}
              />
            ) : (
              <div className="min-h-[164px]">
                <LatencyChart points={latencyPoints} />
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>
              Serviços com problema
            </h3>
            <div className="h-16">
              {loading ? (
                <div
                  className="h-full animate-pulse rounded"
                  style={{ background: 'var(--surface-2)' }}
                />
              ) : maxProblems === 0 ? (
                <p
                  className="flex h-full items-center text-sm"
                  style={{ color: 'var(--text-dim)' }}
                >
                  Nenhum serviço com problema no período.
                </p>
              ) : (
                <div
                  className="flex h-full items-end gap-[2px]"
                  role="img"
                  aria-label={`No máximo ${maxProblems} serviços com problema ao mesmo tempo`}
                >
                  {problems.map((p) => (
                    <span
                      key={p.start}
                      className="min-w-0 flex-1 rounded-t-[3px]"
                      title={`${formatTime(p.start)} · ${p.count} ${p.count === 1 ? 'serviço' : 'serviços'} com problema`}
                      style={{
                        height: p.count ? `${Math.max(8, (p.count / maxProblems) * 100)}%` : '2px',
                        background: p.count ? 'var(--down)' : 'var(--border)',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
