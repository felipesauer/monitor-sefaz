import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DocumentType } from '@monitor-sefaz/catalog';
import type { ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { UfSections } from '../src/components/UfSections.js';

const DOCS = [DocumentType.NFe, DocumentType.BPe];

function service(
  document: ServiceStatusDTO['document'],
  uf: string,
  state: ServiceStatusDTO['state'] = 'OPERATIONAL',
  authorizer = 'SVRS'
): ServiceStatusDTO {
  return {
    id: `${document}:${uf}`,
    document,
    uf,
    authorizer,
    environment: 'production',
    state,
    cStat: 107,
    xMotivo: null,
    latencyMs: 240,
    error: null,
    checkedAt: '2026-11-11T00:00:00.000Z',
  };
}

const sectionTitles = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

describe('UfSections', () => {
  it('põe o estado com problema primeiro e os demais em ordem alfabética', () => {
    render(
      <UfSections
        services={[
          service('NFe', 'AC'),
          service('BPe', 'AC'),
          service('NFe', 'SP', 'DOWN', 'SP'),
          service('NFe', 'BA', 'OPERATIONAL', 'BA'),
          service('BPe', 'BA'),
        ]}
        documents={DOCS}
        ufs={['AC', 'BA', 'SP']}
        series={{}}
        onSelect={() => {}}
      />
    );
    expect(sectionTitles()).toEqual(['São Paulo', 'Acre', 'Bahia']);
    const sp = screen.getByRole('region', { name: 'São Paulo' });
    expect(within(sp).getByText('1 com problema')).toBeInTheDocument();
    expect(within(sp).getByAltText('Bandeira de São Paulo')).toHaveAttribute(
      'src',
      '/flags/sp.png'
    );
  });

  it('marca o documento que a leitura não trouxe no estado', () => {
    render(
      <UfSections
        services={[service('NFe', 'SP', 'OPERATIONAL', 'SP')]}
        documents={DOCS}
        ufs={['SP']}
        series={{}}
        onSelect={() => {}}
      />
    );
    expect(screen.getByText('Sem leitura')).toBeInTheDocument();
    expect(screen.getByText('Tudo no ar')).toBeInTheDocument();
  });

  it('abre o serviço ao clicar no card', () => {
    const onSelect = vi.fn();
    render(
      <UfSections
        services={[service('NFe', 'AC'), service('BPe', 'AC')]}
        documents={DOCS}
        ufs={['AC']}
        series={{}}
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /NF-e/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'NFe:AC' }));
  });

  it('mostra um card de espera por documento enquanto carrega', () => {
    const { container } = render(
      <UfSections
        loading
        services={[]}
        documents={DOCS}
        ufs={['AC', 'SP']}
        series={{}}
        onSelect={() => {}}
      />
    );
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(4);
    expect(sectionTitles()).toEqual(['Acre', 'São Paulo']);
  });

  it('no modo compacto mostra um botão por documento, com a disponibilidade de 24h no cabeçalho', () => {
    const onSelect = vi.fn();
    const pt = (iso: string, state: ServiceStatusDTO['state']) => ({
      timestamp: iso,
      state,
      cStat: null,
      latencyMs: 100,
    });
    render(
      <UfSections
        compact
        services={[service('NFe', 'AC'), service('BPe', 'AC')]}
        documents={DOCS}
        ufs={['AC']}
        series={{
          'NFe:AC': [pt('2026-11-11T10:00:00Z', 'OPERATIONAL'), pt('2026-11-11T10:05:00Z', 'DOWN')],
          'BPe:AC': [
            pt('2026-11-11T10:00:00Z', 'OPERATIONAL'),
            pt('2026-11-11T10:05:00Z', 'OPERATIONAL'),
          ],
        }}
        onSelect={onSelect}
      />
    );
    expect(screen.getByText('75% · 24h')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /BP-e/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'BPe:AC' }));
    expect(screen.queryByText('tempo de acesso')).toBeNull();
  });
});
