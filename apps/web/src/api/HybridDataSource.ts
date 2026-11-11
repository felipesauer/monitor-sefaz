import type {
  DetailSnapshotDTO,
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
 * As duas vêm da mesma coleta de 5 minutos, mas guardam janelas diferentes: o
 * KV do Worker cobre 72h e começa vazio (leva três dias para encher depois de
 * recriado); o JSON estático guarda até 7 dias, mas só o que cabe no teto de
 * tamanho do coletor, e tem os pontos esparsos de antes da coleta de 5 minutos. Preferir só uma delas encolheria o
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
 * O histórico prefere a fonte ao vivo: o KV que a coleta grava a cada 5 minutos
 * cobre as 72h inteiras, e o history.json, preso ao teto de tamanho, pode cobrir
 * menos. Se o Worker não tiver o binding de KV, ou ainda não tiver janela
 * acumulada, o estático assume — um monitor de disponibilidade não pode sair do ar junto
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

  public getDetails(): Promise<DetailSnapshotDTO> {
    // O detalhe só sai da coleta do Actions, publicado no Pages: delega à estática.
    return this.history.getDetails();
  }
}
