import { describe, it, expect } from 'vitest';
import { Catalog } from '../src/Catalog.js';
import { DocumentType, Environment } from '../src/types.js';

describe('Catalog', () => {
  const catalog = new Catalog();

  it('resolve SP como autorizador próprio com URL de produção', () => {
    const entry = catalog.resolve(DocumentType.NFe, 'SP', Environment.Production);
    expect(entry?.authorizer).toBe('SP');
    expect(entry?.url).toContain('fazenda.sp.gov.br');
    expect(entry?.cUF).toBe(35);
  });

  it('delega UF sem autorizador próprio a SVRS', () => {
    expect(catalog.resolveAuthorizer(DocumentType.NFe, 'AC')).toBe('SVRS');
  });

  it('delega MA a SVAN para NF-e', () => {
    expect(catalog.resolveAuthorizer(DocumentType.NFe, 'MA')).toBe('SVAN');
  });

  it('lista 27 serviços de NF-e em produção', () => {
    expect(catalog.list(DocumentType.NFe, Environment.Production)).toHaveLength(27);
  });

  it('usa endpoint de homologação no ambiente de homologação', () => {
    const entry = catalog.resolve(DocumentType.NFe, 'SP', Environment.Homologation);
    // a URL real da SEFAZ-SP de homologação contém "homologacao" no domínio
    expect(entry?.url).toContain('homologacao');
  });

  it('resolve CT-e de SP no autorizador próprio', () => {
    const entry = catalog.resolve(DocumentType.CTe, 'SP', Environment.Production);
    expect(entry?.authorizer).toBe('SP');
    expect(entry?.url).toContain('CTeStatusServico');
  });

  it('resolve a contingência SVC da NF-e por UF', () => {
    expect(catalog.resolveContingency(DocumentType.NFe, 'SP')).toBe('SVCAN');
    expect(catalog.resolveContingency(DocumentType.NFe, 'PR')).toBe('SVCRS');
    expect(catalog.resolveContingency(DocumentType.NFe, 'AC')).toBe('SVCAN');
  });

  it('manda quem autoriza no SVRS para o SVC-AN e o SVAN para o SVC-RS', () => {
    // O SVC-RS roda na infraestrutura do SVRS: contingenciar ali quem já
    // depende do SVRS não protegeria nada.
    for (const { uf, authorizer } of catalog.list(DocumentType.NFe, Environment.Production)) {
      const svc = catalog.resolveContingency(DocumentType.NFe, uf);
      if (authorizer === 'SVRS') expect(svc, uf).toBe('SVCAN');
      if (authorizer === 'SVAN') expect(svc, uf).toBe('SVCRS');
    }
  });

  it('não inventa SVC para documento sem contingência mapeada', () => {
    expect(catalog.resolveContingency(DocumentType.NFCe, 'SP')).toBeNull();
  });

  it('centraliza MDF-e e DC-e no SVRS', () => {
    expect(catalog.resolve(DocumentType.MDFe, 'PA', Environment.Production)?.authorizer).toBe(
      'SVRS'
    );
    expect(catalog.resolve(DocumentType.DCe, 'PA', Environment.Production)?.authorizer).toBe(
      'SVRS'
    );
  });
});
