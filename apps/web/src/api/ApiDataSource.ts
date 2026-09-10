import {
  compactHistorySchema,
  expandAllSeries,
  historyResponseSchema,
  LATENCY_BUCKET_MS,
  statusSnapshotSchema,
  summarySchema,
  type HistoryPeriod,
  type HistoryResponseDTO,
  type StatusSnapshotDTO,
  type SummaryDTO,
  type TechnicalNotesFileDTO,
} from '@monitor-sefaz/contracts';
import {
  fetchJson,
  type DataSource,
  type HistorySeries,
  type StatusFilters,
} from './DataSource.js';

/**
 * Fonte ao vivo: consome a API REST (servidor Fastify self-host ou Cloudflare
 * Worker). Valida toda resposta contra os schemas Zod de contracts.
 */
export class ApiDataSource implements DataSource {
  constructor(private readonly baseUrl: string) {}

  public async getStatus(filters: StatusFilters = {}): Promise<StatusSnapshotDTO> {
    const params = new URLSearchParams({ env: 'production' });
    if (filters.document) params.set('document', filters.document);
    if (filters.uf) params.set('uf', filters.uf);
    // Parse ESTRITO (lança) de propósito: no modo híbrido esta é a fonte ao
    // vivo, e o HybridDataSource depende do throw para cair no estático. Usar o
    // parse tolerante aqui (que devolve {services:[]} sem lançar) neutralizaria
    // o fallback. A resiliência por-item fica só no StaticDataSource, que é o
    // último recurso e não tem para onde cair.
    return statusSnapshotSchema.parse(
      await fetchJson(`${this.baseUrl}/api/v1/status?${params.toString()}`)
    );
  }

  public async getSummary(): Promise<SummaryDTO> {
    return summarySchema.parse(await fetchJson(`${this.baseUrl}/api/v1/summary?env=production`));
  }

  public async getHistory(id: string, period: HistoryPeriod): Promise<HistoryResponseDTO> {
    return historyResponseSchema.parse(
      await fetchJson(
        `${this.baseUrl}/api/v1/services/${encodeURIComponent(id)}/history?period=${period}`
      )
    );
  }

  /**
   * Todas as séries de uma vez, para os sparklines dos cards.
   *
   * Vem do blob compacto do Worker (`/history`, acumulado no KV pelo cron).
   * Expandimos na resolução GROSSA de 1h de propósito: são 135 séries, e na
   * cadência real da coleta isso daria ~117 mil pontos só para desenhar
   * sparklines de poucos pixels. O painel de detalhe pede a série fina à parte.
   */
  public async getHistorySeries(): Promise<HistorySeries> {
    const history = compactHistorySchema.parse(await fetchJson(`${this.baseUrl}/api/v1/history`));
    return expandAllSeries(history, { stepMs: LATENCY_BUCKET_MS });
  }

  /**
   * Como as séries: a API/Worker não serve as Notas Técnicas (é conteúdo estático
   * versionado). No modo híbrido o `HybridDataSource` delega isto ao estático;
   * aqui retornamos vazio para o modo self-host puro.
   */
  public async getTechnicalNotes(): Promise<TechnicalNotesFileDTO> {
    return { updatedAt: new Date(0).toISOString(), notes: [] };
  }
}
