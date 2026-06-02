import {
  historyResponseSchema,
  statusSnapshotSchema,
  summarySchema,
  type HistoryPeriod,
  type HistoryResponseDTO,
  type StatusSnapshotDTO,
  type SummaryDTO,
} from '@monitor-sefaz/contracts';
import { fetchJson, type DataSource, type StatusFilters } from './DataSource.js';

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
}
