import { describe, it, expect } from 'vitest';
import { DocumentType } from '@monitor-sefaz/catalog';
import {
  UFS_BY_REGION,
  nfeContingency,
  ufAuthorizations,
  ufsSharingAuthorizer,
} from '../src/lib/ufFacts.js';
import { authorizerLabel, inUf, ofUf } from '../src/lib/labels.js';

describe('ufAuthorizations', () => {
  it('distingue autorizador próprio de virtual, documento a documento', () => {
    const sp = ufAuthorizations('SP');
    expect(sp.map((a) => [a.document, a.authorizer, a.own])).toEqual([
      [DocumentType.NFe, 'SP', true],
      [DocumentType.NFCe, 'SP', true],
      [DocumentType.CTe, 'SP', true],
      [DocumentType.MDFe, 'SVRS', false],
      [DocumentType.DCe, 'SVRS', false],
    ]);
    expect(ufAuthorizations('MA')[0]).toMatchObject({ authorizer: 'SVAN', own: false });
  });
});

describe('ufsSharingAuthorizer', () => {
  it('lista quem cai junto no mesmo autorizador, sem a própria UF', () => {
    const svrs = ufsSharingAuthorizer(DocumentType.NFe, 'AC');
    expect(svrs).toHaveLength(15);
    expect(svrs).not.toContain('AC');
    expect(svrs).toContain('TO');
    expect(ufsSharingAuthorizer(DocumentType.NFe, 'MA')).toEqual([]);
  });
});

describe('nfeContingency', () => {
  it('vem do catalog', () => {
    expect(nfeContingency('SP')).toBe('SVCAN');
    expect(nfeContingency('MA')).toBe('SVCRS');
  });
});

describe('UFS_BY_REGION', () => {
  it('cobre as 27 UFs, em ordem alfabética dentro da região', () => {
    expect(UFS_BY_REGION.flatMap((r) => r.ufs)).toHaveLength(27);
    const sul = UFS_BY_REGION.find((r) => r.region === 'Sul');
    expect(sul?.ufs).toEqual(['PR', 'RS', 'SC']);
  });
});

describe('rótulos das páginas por UF', () => {
  it('flexiona a preposição pelo artigo do nome', () => {
    expect(ofUf('SP')).toBe('de São Paulo');
    expect(ofUf('RS')).toBe('do Rio Grande do Sul');
    expect(inUf('BA')).toBe('na Bahia');
    expect(inUf('MT')).toBe('em Mato Grosso');
  });

  it('exibe o SVC com hífen e a UF como SEFAZ-UF', () => {
    expect(authorizerLabel('SVCAN')).toBe('SVC-AN');
    expect(authorizerLabel('SVRS')).toBe('SVRS');
    expect(authorizerLabel('MG')).toBe('SEFAZ-MG');
  });
});
