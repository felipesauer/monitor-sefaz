import {
  historyResponseSchema,
  statusSnapshotSchema,
  summarySchema,
  type EnvironmentValue,
  type HistoryPeriod,
  type HistoryResponseDTO,
  type StatusSnapshotDTO,
  type SummaryDTO,
} from '@monitor-sefaz/contracts';

/** Filtros opcionais aplicados à consulta de status. */
export interface StatusFilters {
  document?: string;
  uf?: string;
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao buscar ${url}: HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Cliente tipado da API do monitor. Valida toda resposta contra os schemas Zod
 * de `@monitor-sefaz/contracts`, então o front falha cedo se o contrato divergir.
 */
export class MonitorApiClient {
  constructor(private readonly baseUrl: string = '') {}

  public async getStatus(
    env: EnvironmentValue,
    filters: StatusFilters = {}
  ): Promise<StatusSnapshotDTO> {
    const params = new URLSearchParams({ env });
    if (filters.document) params.set('document', filters.document);
    if (filters.uf) params.set('uf', filters.uf);
    const data = await getJson(`${this.baseUrl}/api/v1/status?${params.toString()}`);
    return statusSnapshotSchema.parse(data);
  }

  public async getSummary(env: EnvironmentValue): Promise<SummaryDTO> {
    const data = await getJson(`${this.baseUrl}/api/v1/summary?env=${env}`);
    return summarySchema.parse(data);
  }

  public async getHistory(
    env: EnvironmentValue,
    id: string,
    period: HistoryPeriod
  ): Promise<HistoryResponseDTO> {
    const data = await getJson(
      `${this.baseUrl}/api/v1/services/${encodeURIComponent(id)}/history?env=${env}&period=${period}`
    );
    return historyResponseSchema.parse(data);
  }
}

export const apiClient = new MonitorApiClient();
