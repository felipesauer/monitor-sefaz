import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  type EnvironmentValue,
  type ServiceStatusDTO,
  type StatusSnapshotDTO,
} from '@monitor-sefaz/contracts';

/** Aplica os serviços recebidos por SSE sobre o snapshot em cache. */
function patchSnapshot(
  current: StatusSnapshotDTO | undefined,
  changed: ServiceStatusDTO[]
): StatusSnapshotDTO | undefined {
  if (!current) {
    return current;
  }
  const byId = new Map(current.services.map((s) => [s.id, s]));
  for (const service of changed) {
    byId.set(service.id, service);
  }
  return {
    ...current,
    generatedAt: changed[0]?.checkedAt ?? current.generatedAt,
    services: [...byId.values()],
  };
}

/**
 * Assina o stream SSE de atualizações e faz patch otimista no cache do
 * TanStack Query, atualizando apenas os serviços que mudaram — sem polling e
 * sem refazer a requisição inteira.
 */
export function useStatusStream(env: EnvironmentValue, baseUrl = ''): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource(`${baseUrl}/api/v1/stream?env=${env}`);

    source.addEventListener('update', (event) => {
      const changed = JSON.parse((event as MessageEvent).data) as ServiceStatusDTO[];
      queryClient.setQueriesData<StatusSnapshotDTO>(
        { queryKey: ['status', env] },
        (current) => patchSnapshot(current, changed)
      );
      // O resumo agregado também depende dos estados: invalida para recalcular.
      void queryClient.invalidateQueries({ queryKey: ['summary', env] });
    });

    return () => source.close();
  }, [env, baseUrl, queryClient]);
}

export { patchSnapshot };
