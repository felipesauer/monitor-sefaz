import {
  historyFileSchema,
  statusSnapshotSchema,
  summarySchema,
  type HistoryPeriod,
  type HistoryResponseDTO,
  type StatusSnapshotDTO,
  type SummaryDTO,
} from '@monitor-sefaz/contracts';
import { fetchJson, type DataSource, type StatusFilters } from './DataSource.js';

const PERIOD_MS: Record<HistoryPeriod, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '72h': 72 * 60 * 60 * 1000,
};

/**
 * Fonte estática: lê os JSONs versionados (gerados pelo GitHub Actions) sob
 * `${base}data/`. Não requer backend — viabiliza o deploy 100% estático no
 * GitHub Pages. O recorte por período do histórico é feito no cliente.
 */
export class StaticDataSource implements DataSource {
  constructor(private readonly base: string) {}

  public async getStatus(filters: StatusFilters = {}): Promise<StatusSnapshotDTO> {
    const snapshot = statusSnapshotSchema.parse(await fetchJson(`${this.base}data/status.json`));
    if (!filters.document && !filters.uf) {
      return snapshot;
    }
    return {
      ...snapshot,
      services: snapshot.services
        .filter((s) => (filters.document ? s.document === filters.document : true))
        .filter((s) => (filters.uf ? s.uf === filters.uf.toUpperCase() : true)),
    };
  }

  public async getSummary(): Promise<SummaryDTO> {
    return summarySchema.parse(await fetchJson(`${this.base}data/summary.json`));
  }

  public async getHistory(id: string, period: HistoryPeriod): Promise<HistoryResponseDTO> {
    const file = historyFileSchema.parse(await fetchJson(`${this.base}data/history.json`));
    const all = file.series[id] ?? [];
    const cutoff = Date.parse(file.updatedAt) - PERIOD_MS[period];
    const points = all.filter((p) => Date.parse(p.timestamp) >= cutoff);
    return { id, period, points };
  }
}
