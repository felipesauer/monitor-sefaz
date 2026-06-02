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

  it('listAll retorna ao menos os serviços de NF-e e NFC-e cadastrados', () => {
    const all = registry.listAll(Environment.Production);
    const nfe = all.filter((t) => t.document === DocumentType.NFe);
    const nfce = all.filter((t) => t.document === DocumentType.NFCe);
    expect(nfe.length).toBe(27);
    expect(nfce.length).toBe(27);
  });
});
