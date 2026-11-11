import { describe, it, expect } from 'vitest';
import type { AuthorizerDetailDTO, DetailSnapshotDTO } from '@monitor-sefaz/contracts';
import { detailFor, isEmptyDetail, operationLabel } from '../src/lib/details.js';

function detail(overrides: Partial<AuthorizerDetailDTO>): AuthorizerDetailDTO {
  return {
    document: 'NFe',
    authorizer: 'SVRS',
    environment: 'production',
    source: 'availability',
    ufs: ['AC', 'AL'],
    operations: [{ operation: 'Autorização4', state: 'OPERATIONAL', cStat: null }],
    ...overrides,
  };
}

const snapshot = (authorizers: AuthorizerDetailDTO[]): DetailSnapshotDTO => ({
  generatedAt: '2026-11-11T01:31:13.963Z',
  authorizers,
});

const AC = { document: 'NFe', uf: 'AC', authorizer: 'SVRS' } as const;

describe('detailFor', () => {
  it('devolve vazio sem snapshot', () => {
    expect(isEmptyDetail(detailFor(undefined, AC))).toBe(true);
  });

  it('prefere o SVRS à Receita para o mesmo autorizador, como o consenso', () => {
    const view = detailFor(
      snapshot([
        detail({ source: 'availability' }),
        detail({
          source: 'svrs',
          operations: [{ operation: 'WS Autorizacao', state: 'DOWN', cStat: 225 }],
        }),
      ]),
      AC
    );
    expect(view.primary?.source).toBe('svrs');
    expect(view.primary?.operations[0]?.state).toBe('DOWN');
  });

  it('separa a contingência SVC que também atende a UF', () => {
    const view = detailFor(
      snapshot([
        detail({}),
        detail({ authorizer: 'SVCAN', ufs: ['AC', 'SP'] }),
        detail({ authorizer: 'SVCRS', ufs: ['MA'] }),
      ]),
      AC
    );
    expect(view.primary?.authorizer).toBe('SVRS');
    expect(view.contingency.map((d) => d.authorizer)).toEqual(['SVCAN']);
  });

  it('ignora outro documento e outra UF', () => {
    const view = detailFor(
      snapshot([detail({ document: 'CTe' }), detail({ authorizer: 'SP', ufs: ['SP'] })]),
      AC
    );
    expect(isEmptyDetail(view)).toBe(true);
  });

  it('traz a homologação do próprio autorizador à parte', () => {
    const view = detailFor(snapshot([detail({}), detail({ environment: 'homologation' })]), AC);
    expect(view.primary?.environment).toBe('production');
    expect(view.homologation?.environment).toBe('homologation');
    expect(view.contingency).toEqual([]);
  });
});

describe('operationLabel', () => {
  it('tira o prefixo "WS " do SVRS e mantém o rótulo da Receita', () => {
    expect(operationLabel('WS Consulta Situacao')).toBe('Consulta Situacao');
    expect(operationLabel('Autorização4')).toBe('Autorização4');
  });
});
