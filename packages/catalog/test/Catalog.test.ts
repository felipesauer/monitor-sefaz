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
    expect(entry?.url).toContain('homologacao');
  });

  it('retorna null para documento sem endpoints cadastrados (CT-e na Fase 1)', () => {
    expect(catalog.resolve(DocumentType.CTe, 'SP', Environment.Production)).toBeNull();
  });
});
