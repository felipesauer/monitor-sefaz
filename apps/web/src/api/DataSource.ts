import {
  resilientStatusSnapshotSchema,
  type HistoryPeriod,
  type HistoryPointDTO,
  type HistoryResponseDTO,
  type StatusSnapshotDTO,
  type SummaryDTO,
  type TechnicalNotesFileDTO,
} from '@monitor-sefaz/contracts';

/** Mapa `id do serviço` → série de pontos, usado para os sparklines dos cards. */
export type HistorySeries = Record<string, HistoryPointDTO[]>;

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
  /** Todas as séries de uma vez (para os sparklines dos cards). */
  getHistorySeries(): Promise<HistorySeries>;
  /** Notas Técnicas publicadas no portal (conteúdo estático versionado). */
  getTechnicalNotes(): Promise<TechnicalNotesFileDTO>;
}

export async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Falha ao buscar ${url}: HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Valida um snapshot de status de forma resiliente em duas camadas:
 * 1. services inválidos individualmente são descartados (schema tolerante);
 * 2. se a estrutura toda for inválida (ex.: `services` não é array), em vez de
 *    lançar e apagar o dashboard, loga e devolve um snapshot vazio — a UI mostra
 *    o estado "sem serviços" em vez de uma tela de erro.
 */
export function parseStatusSnapshot(data: unknown, source: string): StatusSnapshotDTO {
  const result = resilientStatusSnapshotSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn(`Snapshot de status inválido (${source}); exibindo vazio.`, result.error.issues);
  return { environment: 'production', generatedAt: new Date().toISOString(), services: [] };
}
