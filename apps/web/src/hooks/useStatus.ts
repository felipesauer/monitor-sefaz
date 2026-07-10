import { useQuery } from '@tanstack/react-query';
import type { HistoryPeriod } from '@monitor-sefaz/contracts';
import { dataSource } from '../api/index.js';

/**
 * Intervalo de polling padrão. Substitui o SSE no modo estático (GitHub Pages,
 * sem servidor persistente); no modo API/Worker também mantém o dado fresco.
 */
export const POLL_INTERVAL_MS = 60_000;

/** `false` pausa o polling (controle de auto-refresh no header). */
export function useStatusSnapshot(refreshMs: number | false = POLL_INTERVAL_MS) {
  return useQuery({
    queryKey: ['status'],
    queryFn: () => dataSource.getStatus(),
    refetchInterval: refreshMs,
  });
}

export function useSummary(refreshMs: number | false = POLL_INTERVAL_MS) {
  return useQuery({
    queryKey: ['summary'],
    queryFn: () => dataSource.getSummary(),
    refetchInterval: refreshMs,
  });
}

export function useServiceHistory(id: string, period: HistoryPeriod) {
  return useQuery({
    queryKey: ['history', id, period],
    queryFn: () => dataSource.getHistory(id, period),
  });
}

/** Todas as séries (para os sparklines dos cards). Atualiza mais devagar. */
export function useHistorySeries() {
  return useQuery({
    queryKey: ['history-series'],
    queryFn: () => dataSource.getHistorySeries(),
    refetchInterval: POLL_INTERVAL_MS * 5,
    staleTime: POLL_INTERVAL_MS,
  });
}

/** Notas Técnicas do portal. Mudam raramente → polling lento. */
export function useTechnicalNotes() {
  return useQuery({
    queryKey: ['technical-notes'],
    queryFn: () => dataSource.getTechnicalNotes(),
    refetchInterval: POLL_INTERVAL_MS * 5,
    staleTime: POLL_INTERVAL_MS,
  });
}
