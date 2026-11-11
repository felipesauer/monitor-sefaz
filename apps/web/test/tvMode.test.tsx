import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ServiceStatusDTO, StatusSnapshotDTO, SummaryDTO } from '@monitor-sefaz/contracts';
import { DashboardPage } from '../src/pages/DashboardPage.js';
import { GlobalBanner } from '../src/components/GlobalBanner.js';

vi.stubGlobal(
  'fetch',
  vi.fn(() => new Promise(() => {}))
);

const service: ServiceStatusDTO = {
  id: 'NFe:SP',
  document: 'NFe',
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

async function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  const snapshot: StatusSnapshotDTO = {
    environment: 'production',
    generatedAt: '2026-11-11T00:00:00.000Z',
    services: [service],
  };
  client.setQueryData(['status'], snapshot);
  client.setQueryData(['history-series'], {});
  await act(async () => {
    render(
      <QueryClientProvider client={client}>
        <DashboardPage />
      </QueryClientProvider>
    );
  });
}

describe('modo TV (#tv)', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('mostra só o essencial e a lista compacta', async () => {
    window.location.hash = '#tv';
    await renderDashboard();
    expect(screen.getByRole('link', { name: 'Sair do modo TV' })).toHaveAttribute('href', '#');
    expect(screen.queryByText(/filtrar por estado/i)).toBeNull();
    expect(screen.queryByRole('contentinfo')).toBeNull();
    // lista compacta: o botão do documento traz o estado escrito
    expect(screen.getByRole('button', { name: /NF-e.*Operacional/ })).toBeInTheDocument();
  });

  it('fora do modo TV oferece o link para ele', async () => {
    await renderDashboard();
    expect(screen.getByRole('link', { name: 'Modo TV' })).toHaveAttribute('href', '#tv');
    expect(screen.queryByRole('link', { name: 'Sair do modo TV' })).toBeNull();
  });
});

describe('GlobalBanner', () => {
  it('traz o tempo médio de acesso, que antes ficava nos cards de métricas', () => {
    const summary = {
      total: 162,
      operational: 162,
      failing: 0,
      availability: 100,
      avgLatencyMs: 850,
    } as SummaryDTO;
    render(<GlobalBanner summary={summary} />);
    expect(screen.getByText(/tempo médio de acesso 850/)).toBeInTheDocument();
  });
});
