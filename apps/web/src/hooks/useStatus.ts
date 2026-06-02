import { useQuery } from '@tanstack/react-query';
import type { EnvironmentValue, HistoryPeriod } from '@monitor-sefaz/contracts';
import { apiClient, type StatusFilters } from '../api/client.js';

/**
 * Intervalo de polling de fallback. O caminho primário de atualização é o SSE
 * (`useStatusStream`); este refetch lento cobre o caso de a conexão SSE cair.
 */
const POLL_INTERVAL_MS = 120_000;

export function useStatusSnapshot(env: EnvironmentValue, filters: StatusFilters = {}) {
  return useQuery({
    queryKey: ['status', env, filters.document ?? null, filters.uf ?? null],
    queryFn: () => apiClient.getStatus(env, filters),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useSummary(env: EnvironmentValue) {
  return useQuery({
    queryKey: ['summary', env],
    queryFn: () => apiClient.getSummary(env),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useServiceHistory(env: EnvironmentValue, id: string, period: HistoryPeriod) {
  return useQuery({
    queryKey: ['history', env, id, period],
    queryFn: () => apiClient.getHistory(env, id, period),
  });
}
