import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AuthorizerDetailDTO } from '@monitor-sefaz/contracts';
import { AuthorizerOperations } from '../src/components/AuthorizerOperations.js';

const svrs: AuthorizerDetailDTO = {
  document: 'NFe',
  authorizer: 'SVRS',
  environment: 'production',
  source: 'svrs',
  ufs: ['AC', 'AL', 'AP'],
  operations: [
    { operation: 'WS Autorizacao', state: 'DOWN', cStat: 225, sourceCheckedAt: '01:30:12' },
    { operation: 'WS Status', state: 'OPERATIONAL', cStat: 107 },
  ],
};

describe('AuthorizerOperations', () => {
  it('não renderiza nada sem detalhe', () => {
    const { container } = render(
      <AuthorizerOperations view={{ primary: null, contingency: [], homologation: null }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('lista as operações com o estado de cada uma', () => {
    render(<AuthorizerOperations view={{ primary: svrs, contingency: [], homologation: null }} />);
    expect(screen.getByText('Autorizacao')).toBeInTheDocument();
    expect(screen.getByText('Indisponível')).toBeInTheDocument();
    expect(screen.getByText('· 01:30:12')).toBeInTheDocument();
    expect(screen.getByText('Autorizacao').closest('li')).toHaveAttribute(
      'title',
      'cStat 225 na aferição da fonte'
    );
    expect(screen.getByText(/portal do SVRS · atende 3 UFs/)).toBeInTheDocument();
  });

  it('mostra a contingência e a homologação à parte', () => {
    render(
      <AuthorizerOperations
        view={{
          primary: svrs,
          contingency: [{ ...svrs, authorizer: 'SVCAN', source: 'availability' }],
          homologation: { ...svrs, environment: 'homologation', source: 'availability' },
        }}
      />
    );
    expect(screen.getByText('Contingência')).toBeInTheDocument();
    expect(screen.getByText(/SVC-AN · portal da Receita/)).toBeInTheDocument();
    expect(screen.getByText('Homologação (ambiente de testes)')).toBeInTheDocument();
  });
});
