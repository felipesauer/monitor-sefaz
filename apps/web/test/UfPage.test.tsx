import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ServiceStatusDTO, StatusSnapshotDTO } from '@monitor-sefaz/contracts';
import { UfPage } from '../src/pages/UfPage.js';

// O status vem pré-carregado no cache; o resto dos fetches nunca resolve.
vi.stubGlobal(
  'fetch',
  vi.fn(() => new Promise(() => {}))
);

function service(document: ServiceStatusDTO['document']): ServiceStatusDTO {
  return {
    id: `${document}:SP`,
    document,
    uf: 'SP',
    authorizer: 'SP',
    environment: 'production',
    state: 'OPERATIONAL',
    cStat: 107,
    xMotivo: null,
    latencyMs: 240,
    error: null,
    checkedAt: '2026-11-11T00:00:00.000Z',
  };
}

describe('UfPage', () => {
  it('põe um card "sem leitura" no lugar do documento que a leitura não trouxe', () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    const snapshot: StatusSnapshotDTO = {
      environment: 'production',
      generatedAt: new Date().toISOString(),
      services: (['NFe', 'NFCe', 'CTe', 'MDFe', 'DCe'] as const).map(service),
    };
    client.setQueryData(['status'], snapshot);
    render(
      <QueryClientProvider client={client}>
        <UfPage uf="SP" />
      </QueryClientProvider>
    );
    // 5 cards reais e o do BP-e, que o SVRS não publica para SP.
    expect(screen.getAllByRole('button', { name: /São Paulo/ })).toHaveLength(5);
    expect(screen.getByText('Sem leitura pública')).toBeInTheDocument();
    expect(screen.queryByText('Carregando…')).toBeNull();
  });
});
