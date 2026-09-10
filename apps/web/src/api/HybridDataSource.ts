import type {
  HistoryPeriod,
  HistoryResponseDTO,
  StatusSnapshotDTO,
  SummaryDTO,
  TechnicalNotesFileDTO,
} from '@monitor-sefaz/contracts';
import type { HistoryPointDTO } from '@monitor-sefaz/contracts';
import type { DataSource, HistorySeries, StatusFilters } from './DataSource.js';

/**
 * Junta a série estática com a ao vivo, sem escolher entre as duas.
 *
 * As fontes têm forças opostas: o JSON versionado cobre 7 dias com poucos
 * pontos por dia, e o KV do Worker cobre 72h com um ponto a cada 5 minutos —
 * mas começa vazio e leva dias para encher. Preferir só uma delas encolheria o
 * gráfico logo depois de um deploy do Worker (ou de um KV recriado), que é
 * justamente quando a janela ao vivo é mais curta.
 *
 * Então o estático vale até onde a janela ao vivo começa, e dali em diante
 * vale a ao vivo, que é mais densa. Onde as duas se sobrepõem, a ao vivo ganha.
 */
function mergePoints(
  staticPoints: readonly HistoryPointDTO[],
  livePoints: readonly HistoryPointDTO[]
): HistoryPointDTO[] {
  if (livePoints.length === 0) return [...staticPoints];
  const liveStart = Date.parse(livePoints[0]!.timestamp);
  const older = staticPoints.filter((p) => Date.parse(p.timestamp) < liveStart);
  return [...older, ...livePoints];
}

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
    const stat = await this.history.getHistory(id, period);
    try {
      const live = await this.live.getHistory(id, period);
      return { id, period, points: mergePoints(stat.points, live.points) };
    } catch (err) {
      console.warn('Histórico ao vivo indisponível; usando só o estático.', err);
      return stat;
    }
  }

  public async getHistorySeries(): Promise<HistorySeries> {
    const stat = await this.history.getHistorySeries();
    try {
      const live = await this.live.getHistorySeries();
      const merged: HistorySeries = { ...stat };
      for (const [id, points] of Object.entries(live)) {
        merged[id] = mergePoints(stat[id] ?? [], points);
      }
      return merged;
    } catch (err) {
      console.warn('Séries ao vivo indisponíveis; usando só o estático.', err);
      return stat;
    }
  }

  public getTechnicalNotes(): Promise<TechnicalNotesFileDTO> {
    // Conteúdo estático (como o histórico) — delega à fonte versionada.
    return this.history.getTechnicalNotes();
  }
}
