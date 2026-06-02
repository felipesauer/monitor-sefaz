import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { StatusGrid } from '../src/components/StatusGrid.js';
import { STATE_META } from '../src/components/serviceState.js';

function service(overrides: Partial<ServiceStatusDTO>): ServiceStatusDTO {
  return {
    id: 'NFe:SP',
    document: 'NFe' as ServiceStatusDTO['document'],
    uf: 'SP',
    authorizer: 'SP',
    environment: 'producao',
    state: 'OPERATIONAL',
    cStat: 107,
    xMotivo: 'ok',
    latencyMs: 100,
    error: null,
    checkedAt: '2026-06-02T11:00:00.000Z',
    ...overrides,
  };
}

describe('StatusGrid', () => {
  it('mostra mensagem de vazio quando não há serviços', () => {
    render(<StatusGrid services={[]} />);
    expect(screen.getByText(/Nenhum dado disponível/i)).toBeInTheDocument();
  });

  it('renderiza uma linha por UF e colore as células pelo estado', () => {
    render(
      <StatusGrid
        services={[
          service({ id: 'NFe:SP', uf: 'SP', state: 'OPERATIONAL' }),
          service({ id: 'NFe:RS', uf: 'RS', authorizer: 'RS', state: 'DOWN' }),
        ]}
      />
    );

    expect(screen.getByRole('row', { name: /SP/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /RS/ })).toBeInTheDocument();

    // a célula DOWN deve usar a cor vermelha de indisponível
    const downCell = screen.getByTitle(/Indisponível/i);
    expect(downCell).toHaveStyle({ backgroundColor: STATE_META.DOWN.color });
  });
});
