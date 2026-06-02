import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { ServiceList } from '../src/components/ServiceList.js';

function service(overrides: Partial<ServiceStatusDTO>): ServiceStatusDTO {
  return {
    id: 'NFe:SP',
    document: 'NFe' as ServiceStatusDTO['document'],
    uf: 'SP',
    authorizer: 'SP',
    environment: 'production',
    state: 'OPERATIONAL',
    cStat: 107,
    xMotivo: 'ok',
    latencyMs: 100,
    error: null,
    checkedAt: '2026-06-02T11:00:00.000Z',
    ...overrides,
  };
}

describe('ServiceList', () => {
  it('mostra mensagem de vazio quando não há serviços', () => {
    render(<ServiceList services={[]} onSelect={() => {}} />);
    expect(screen.getByText(/Nenhum dado disponível/i)).toBeInTheDocument();
  });

  it('agrupa por documento e mostra o rótulo do estado', () => {
    render(
      <ServiceList
        services={[
          service({ id: 'NFe:SP', uf: 'SP', state: 'OPERATIONAL' }),
          service({ id: 'NFe:RS', uf: 'RS', authorizer: 'RS', state: 'DOWN' }),
        ]}
        onSelect={() => {}}
      />
    );
    expect(screen.getByText('NF-e')).toBeInTheDocument();
    expect(screen.getByText('Operacional')).toBeInTheDocument();
    expect(screen.getByText('Indisponível')).toBeInTheDocument();
    expect(screen.getByText('1/2 no ar')).toBeInTheDocument();
  });

  it('dispara onSelect ao clicar numa linha', () => {
    const onSelect = vi.fn();
    render(<ServiceList services={[service({ uf: 'MG', authorizer: 'MG' })]} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /MG/ }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
