import type {
  HistoryPeriod,
  HistoryResponseDTO,
  StatusSnapshotDTO,
  SummaryDTO,
  TechnicalNotesFileDTO,
} from '@monitor-sefaz/contracts';
import type { DataSource, HistorySeries, StatusFilters } from './DataSource.js';

/**
 * Combina duas fontes: a AO VIVO (Worker/API) e a ESTÁTICA (JSONs versionados
 * pelo GitHub Actions), com a estática sempre como rede de segurança.
 *
 * O histórico prefere a fonte ao vivo: desde que o Worker passou a acumular a
 * série em KV (cron de 5 min), ela tem resolução muito melhor que o
 * history.json do Actions, cujo cron best-effort entrega ~6 pontos/dia. Se o
 * Worker não tiver o binding de KV, ou ainda não tiver janela acumulada, o
 * estático assume — um monitor de disponibilidade não pode sair do ar junto
 * com sua própria fonte.
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

  public async getHistory(id: string, period: HistoryPeriod): Promise<HistoryResponseDTO> {
    try {
      const live = await this.live.getHistory(id, period);
      if (live.points.length > 0) return live;
    } catch (err) {
      console.warn('Histórico ao vivo indisponível; usando o estático.', err);
    }
    return this.history.getHistory(id, period);
  }

  public async getHistorySeries(): Promise<HistorySeries> {
    try {
      const live = await this.live.getHistorySeries();
      // Um objeto vazio significa "ainda sem janela acumulada no KV" (ou um
      // Worker sem o binding). Nesse caso o estático ainda é melhor que nada.
      if (Object.keys(live).length > 0) return live;
    } catch (err) {
      console.warn('Séries ao vivo indisponíveis; usando o estático.', err);
    }
    return this.history.getHistorySeries();
  }

  public getTechnicalNotes(): Promise<TechnicalNotesFileDTO> {
    // Conteúdo estático (como o histórico) — delega à fonte versionada.
    return this.history.getTechnicalNotes();
  }
}
