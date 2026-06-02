import { describe, it, expect } from 'vitest';
import { DocumentType, Environment } from '@monitor-sefaz/catalog';
import { CatalogAuthorizerRegistry } from '../../src/registry/AuthorizerRegistry.js';

describe('CatalogAuthorizerRegistry', () => {
  const registry = new CatalogAuthorizerRegistry();

  it('resolve SP como autorizador próprio para NF-e', () => {
    const target = registry.resolve(DocumentType.NFe, 'SP', Environment.Production);
    expect(target).not.toBeNull();
    expect(target?.authorizer).toBe('SP');
    expect(target?.cUF).toBe(35);
    expect(target?.url).toContain('fazenda.sp.gov.br');
  });

  it('resolve uma UF sem autorizador próprio (AC) delegando a SVRS', () => {
    const target = registry.resolve(DocumentType.NFe, 'AC', Environment.Production);
    expect(target?.authorizer).toBe('SVRS');
    expect(target?.cUF).toBe(12); // mantém o cUF da UF física
    expect(target?.url).toContain('svrs');
  });

  it('resolve MA delegando a SVAN para NF-e', () => {
    const target = registry.resolve(DocumentType.NFe, 'MA', Environment.Production);
    expect(target?.authorizer).toBe('SVAN');
  });

  it('resolve CT-e de MG no autorizador próprio e de AC no SVRS', () => {
    expect(registry.resolve(DocumentType.CTe, 'MG', Environment.Production)?.authorizer).toBe('MG');
    expect(registry.resolve(DocumentType.CTe, 'AC', Environment.Production)?.authorizer).toBe('SVRS');
  });

  it('resolve MDF-e e DC-e centralizados no SVRS', () => {
    expect(registry.resolve(DocumentType.MDFe, 'SP', Environment.Production)?.authorizer).toBe('SVRS');
    expect(registry.resolve(DocumentType.DCe, 'SP', Environment.Production)?.authorizer).toBe('SVRS');
  });

  it('listAll cobre NF-e e NFC-e (27 cada) e inclui os 5 documentos', () => {
    const all = registry.listAll(Environment.Production);
    expect(all.filter((t) => t.document === DocumentType.NFe)).toHaveLength(27);
    expect(all.filter((t) => t.document === DocumentType.NFCe)).toHaveLength(27);
    const documents = new Set(all.map((t) => t.document));
    expect(documents).toEqual(
      new Set([
        DocumentType.NFe,
        DocumentType.NFCe,
        DocumentType.CTe,
        DocumentType.MDFe,
        DocumentType.DCe,
      ])
    );
  });
});
