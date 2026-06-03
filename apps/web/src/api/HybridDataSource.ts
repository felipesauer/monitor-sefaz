import type {
  HistoryPeriod,
  HistoryResponseDTO,
  StatusSnapshotDTO,
  SummaryDTO,
} from '@monitor-sefaz/contracts';
import type { DataSource, StatusFilters } from './DataSource.js';

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

  public getStatus(filters?: StatusFilters): Promise<StatusSnapshotDTO> {
    return this.live.getStatus(filters);
  }

  public getSummary(): Promise<SummaryDTO> {
    return this.live.getSummary();
  }

  public getHistory(id: string, period: HistoryPeriod): Promise<HistoryResponseDTO> {
    return this.history.getHistory(id, period);
  }
}
