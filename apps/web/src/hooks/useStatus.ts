import { useQuery } from '@tanstack/react-query';
import type { EnvironmentValue } from '@monitor-sefaz/contracts';
import { apiClient, type StatusFilters } from '../api/client.js';

/** Intervalo de polling do snapshot (será substituído por SSE na Fase 3). */
const POLL_INTERVAL_MS = 30_000;

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
