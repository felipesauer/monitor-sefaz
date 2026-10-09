import { describe, it, expect } from 'vitest';
import { DocumentType } from '@monitor-sefaz/catalog';
import { documentsWithoutStatus, ufsWithoutStatus } from '../src/lib/coverage.js';

const services = [
  { document: DocumentType.NFe, uf: 'SP' },
  { document: DocumentType.BPe, uf: 'RS' },
  { document: DocumentType.BPe, uf: 'AC' },
];

describe('cobertura do snapshot', () => {
  it('lista os documentos que a UF não tem no snapshot', () => {
    const sp = documentsWithoutStatus(services, 'SP');
    expect(sp.has(DocumentType.BPe)).toBe(true);
    expect(sp.has(DocumentType.NFe)).toBe(false);
    expect(documentsWithoutStatus(services, 'RS').has(DocumentType.BPe)).toBe(false);
  });

  it('sem nenhum serviço da UF, todos os documentos estão sem status', () => {
    expect(documentsWithoutStatus([], 'SP').size).toBe(6);
  });

  it('lista as UFs que o documento não cobre', () => {
    const missing = ufsWithoutStatus(services, DocumentType.BPe);
    expect(missing).toHaveLength(25);
    expect(missing).toContain('SP');
    expect(missing).not.toContain('RS');
    expect(missing).not.toContain('AC');
  });
});
