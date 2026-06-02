import type {
  HistoryPeriod,
  HistoryResponseDTO,
  StatusSnapshotDTO,
  SummaryDTO,
} from '@monitor-sefaz/contracts';

/** Filtros opcionais aplicados à consulta de status. */
export interface StatusFilters {
  document?: string;
  uf?: string;
}

/**
 * Fonte de dados do dashboard. Abstrai DE ONDE o front lê:
 * - `ApiDataSource`: API/Worker ao vivo (REST com CORS).
 * - `StaticDataSource`: JSONs estáticos versionados (modo GitHub Pages).
 * Assim a SPA roda igual com backend ou 100% estática.
 */
export interface DataSource {
  getStatus(filters?: StatusFilters): Promise<StatusSnapshotDTO>;
  getSummary(): Promise<SummaryDTO>;
  getHistory(id: string, period: HistoryPeriod): Promise<HistoryResponseDTO>;
}

export async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Falha ao buscar ${url}: HTTP ${response.status}`);
  }
  return response.json();
}
