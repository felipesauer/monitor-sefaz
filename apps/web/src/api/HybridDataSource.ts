import type {
  HistoryPeriod,
  HistoryResponseDTO,
  StatusSnapshotDTO,
  SummaryDTO,
  TechnicalNotesFileDTO,
} from '@monitor-sefaz/contracts';
import type { DataSource, HistorySeries, StatusFilters } from './DataSource.js';

/**
 * Combina duas fontes: status/summary vêm da fonte AO VIVO (Worker/API), e o
 * histórico vem da fonte ESTÁTICA (history.json acumulado pelo GitHub Actions).
 *
 * Isso resolve o fato de o Worker ser stateless (cada request é um snapshot
 * novo, sem acúmulo) — o uptime ao longo do tempo só existe no JSON versionado.
 */
export class HybridDataSource implements DataSource {
  constructor(
    private readonly live: DataSource,
    private readonly history: DataSource
  ) {}

  public async getStatus(filters?: StatusFilters): Promise<StatusSnapshotDTO> {
    try {
      return await this.live.getStatus(filters);
    } catch (err) {
      // A fonte ao vivo (Worker/API) caiu: em vez de derrubar o dashboard,
      // servimos o último snapshot estático versionado. Um monitor de
      // disponibilidade não pode sair do ar junto com sua própria fonte.
      console.warn('Fonte ao vivo indisponível em getStatus; usando o estático.', err);
      return this.history.getStatus(filters);
    }
  }

  public async getSummary(): Promise<SummaryDTO> {
    try {
      return await this.live.getSummary();
    } catch (err) {
      console.warn('Fonte ao vivo indisponível em getSummary; usando o estático.', err);
      return this.history.getSummary();
    }
  }

  public getHistory(id: string, period: HistoryPeriod): Promise<HistoryResponseDTO> {
    return this.history.getHistory(id, period);
  }

  public getHistorySeries(): Promise<HistorySeries> {
    return this.history.getHistorySeries();
  }

  public getTechnicalNotes(): Promise<TechnicalNotesFileDTO> {
    // Conteúdo estático (como o histórico) — delega à fonte versionada.
    return this.history.getTechnicalNotes();
  }
}
