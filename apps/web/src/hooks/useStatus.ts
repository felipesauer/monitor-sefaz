import { useQuery } from '@tanstack/react-query';
import type { HistoryPeriod } from '@monitor-sefaz/contracts';
import { dataSource, type StatusFilters } from '../api/index.js';

/**
 * Intervalo de polling. Substitui o SSE no modo estático (GitHub Pages, sem
 * servidor persistente); no modo API/Worker também mantém o dado fresco.
 */
export const POLL_INTERVAL_MS = 60_000;

export function useStatusSnapshot(filters: StatusFilters = {}) {
  return useQuery({
    queryKey: ['status', filters.document ?? null, filters.uf ?? null],
    queryFn: () => dataSource.getStatus(filters),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useSummary() {
  return useQuery({
    queryKey: ['summary'],
    queryFn: () => dataSource.getSummary(),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useServiceHistory(id: string, period: HistoryPeriod) {
  return useQuery({
    queryKey: ['history', id, period],
    queryFn: () => dataSource.getHistory(id, period),
  });
}
