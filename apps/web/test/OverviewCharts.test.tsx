import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocumentType } from '@monitor-sefaz/catalog';
import type { HistoryPointDTO } from '@monitor-sefaz/contracts';
import { OverviewCharts } from '../src/components/OverviewCharts.js';
import { MapDetail } from '../src/components/MapDetail.js';

const end = Date.parse('2026-11-11T12:00:00Z');
const at = (
  minutesAgo: number,
  state: HistoryPointDTO['state'],
  latencyMs = 200
): HistoryPointDTO => ({
  timestamp: new Date(end - minutesAgo * 60_000).toISOString(),
  state,
  cStat: null,
  latencyMs,
});

describe('OverviewCharts', () => {
  it('mostra a disponibilidade de cada documento e os serviços com problema', () => {
    render(
      <OverviewCharts
        end={end}
        documents={[DocumentType.NFe, DocumentType.CTe]}
        series={{
          'NFe:SP': [at(60, 'OPERATIONAL'), at(30, 'DOWN'), at(5, 'OPERATIONAL')],
          'CTe:SP': [at(60, 'OPERATIONAL'), at(5, 'OPERATIONAL')],
        }}
      />
    );
    const nfe = screen.getByRole('row', { name: /NF-e/ });
    expect(nfe).toHaveTextContent('66.7%');
    expect(screen.getByRole('row', { name: /CT-e/ })).toHaveTextContent('100%');
    expect(
      screen.getByRole('img', { name: /No máximo 1 serviços com problema/ })
    ).toBeInTheDocument();
  });

  it('diz quando não houve problema, em vez de um gráfico vazio', () => {
    render(
      <OverviewCharts
        end={end}
        documents={[DocumentType.NFe]}
        series={{ 'NFe:SP': [at(5, 'OPERATIONAL')] }}
      />
    );
    expect(screen.getByText('Nenhum serviço com problema no período.')).toBeInTheDocument();
  });

  it('reserva o espaço enquanto o histórico carrega', () => {
    render(<OverviewCharts documents={[DocumentType.NFe]} />);
    expect(screen.getByText('Carregando o histórico…')).toBeInTheDocument();
  });
});

describe('MapDetail', () => {
  const svc = (document: string, uf: string, state = 'OPERATIONAL') =>
    ({
      id: `${document}:${uf}`,
      document,
      uf,
      authorizer: uf,
      environment: 'production',
      state,
      cStat: null,
      xMotivo: null,
      latencyMs: 300,
      error: null,
      checkedAt: '2026-11-11T00:00:00Z',
    }) as never;

  it('resume o país e lista os estados com problema', () => {
    render(
      <MapDetail
        uf={null}
        documents={[DocumentType.NFe]}
        services={[svc('NFe', 'SP', 'DOWN'), svc('NFe', 'BA')]}
      />
    );
    expect(screen.getByText('Brasil agora')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /SP/ })).toHaveAttribute('href', '/sefaz-sp/');
  });

  it('mostra cada documento do estado em foco e os botões para os cards e a página', () => {
    render(
      <MapDetail
        uf="BA"
        documents={[DocumentType.NFe, DocumentType.BPe]}
        services={[svc('NFe', 'BA')]}
      />
    );
    expect(screen.getByRole('heading', { name: 'Bahia' })).toBeInTheDocument();
    expect(screen.getByText('Sem leitura')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver os cards de BA' })).toHaveAttribute(
      'href',
      '#uf-BA'
    );
    expect(screen.getByRole('link', { name: /Página da SEFAZ-BA/ })).toHaveAttribute(
      'href',
      '/sefaz-ba/'
    );
  });
});
