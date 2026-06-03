import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { ServiceCard } from '../src/components/ServiceCard.js';

function service(overrides: Partial<ServiceStatusDTO> = {}): ServiceStatusDTO {
  return {
    id: 'NFe:SP',
    document: 'NFe' as ServiceStatusDTO['document'],
    uf: 'SP',
    authorizer: 'SP',
    environment: 'production',
    state: 'OPERATIONAL',
    cStat: 107,
    xMotivo: null,
    latencyMs: 240,
    error: null,
    checkedAt: '2026-06-03T12:00:00.000Z',
    ...overrides,
  };
}

describe('ServiceCard', () => {
  it('mostra UF, autorizador, estado e latência', () => {
    render(
      <ServiceCard
        service={service({ id: 'NFe:AC', uf: 'AC', authorizer: 'SVRS' })}
        onSelect={() => {}}
      />
    );
    expect(screen.getByText('AC')).toBeInTheDocument();
    expect(screen.getByText('SVRS')).toBeInTheDocument();
    expect(screen.getByText('Operacional')).toBeInTheDocument();
    expect(screen.getByText('240')).toBeInTheDocument();
    expect(screen.getByText('ms')).toBeInTheDocument();
  });

  it('formata latência ≥ 1s em segundos', () => {
    render(<ServiceCard service={service({ latencyMs: 1500 })} onSelect={() => {}} />);
    expect(screen.getByText('1.5')).toBeInTheDocument();
    expect(screen.getByText('s')).toBeInTheDocument();
  });

  it('dispara onSelect ao clicar', () => {
    const onSelect = vi.fn();
    render(<ServiceCard service={service()} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
