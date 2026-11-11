import {
  detailSnapshotSchema,
  historyFileSchema,
  summarySchema,
  technicalNotesFileSchema,
  type DetailSnapshotDTO,
  type HistoryPeriod,
  type HistoryResponseDTO,
  type StatusSnapshotDTO,
  type SummaryDTO,
  type TechnicalNotesFileDTO,
} from '@monitor-sefaz/contracts';
import {
  EMPTY_DETAILS,
  fetchJson,
  parseStatusSnapshot,
  type DataSource,
  type HistorySeries,
  type StatusFilters,
} from './DataSource.js';

const PERIOD_MS: Record<HistoryPeriod, number> = {
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
    const snapshot = parseStatusSnapshot(
      await fetchJson(`${this.base}data/status.json`),
      'estático'
    );
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

  public async getHistorySeries(): Promise<HistorySeries> {
    const file = historyFileSchema.parse(await fetchJson(`${this.base}data/history.json`));
    return file.series;
  }

  public async getTechnicalNotes(): Promise<TechnicalNotesFileDTO> {
    // Tolerante: o technical-notes.json só existe depois que a coleta de NTs
    // roda com sucesso. Se faltar (404) ou vier inválido, devolve vazio em vez
    // de derrubar o dashboard — a seção simplesmente não aparece.
    try {
      return technicalNotesFileSchema.parse(
        await fetchJson(`${this.base}data/technical-notes.json`)
      );
    } catch {
      return { updatedAt: new Date(0).toISOString(), notes: [] };
    }
  }

  public async getDetails(): Promise<DetailSnapshotDTO> {
    // Tolerante como as Notas Técnicas: o details.json só existe depois da
    // primeira coleta com a camada de detalhe. Faltando ou inválido, o painel
    // mostra só o cabeçalho.
    try {
      return detailSnapshotSchema.parse(await fetchJson(`${this.base}data/details.json`));
    } catch {
      return EMPTY_DETAILS;
    }
  }
}
