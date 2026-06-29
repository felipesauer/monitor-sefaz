import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DocumentType } from '@monitor-sefaz/catalog';
import { IntegraNotasProvider, mapIntegraNotasState } from '../../src/integranotas/IntegraNotasProvider.js';
import { ServiceState } from '../../src/domain/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const nfeFixture = readFileSync(join(here, '..', 'fixtures', 'integranotas', 'nfe.json'), 'utf8');

describe('mapIntegraNotasState', () => {
  const GREEN = 'rgb(46, 202, 139)';
  it('normal=1 → Operational', () => {
    expect(mapIntegraNotasState(1, 0, GREEN, 1)).toBe(ServiceState.Operational);
  });
  it('normal=0 e svc=1 → Contingency', () => {
    expect(mapIntegraNotasState(0, 1, 'rgb(47, 85, 212)', 1)).toBe(ServiceState.Contingency);
  });
  it('vermelho → Down', () => {
    expect(mapIntegraNotasState(0, 0, 'rgb(228, 63, 82)', 1)).toBe(ServiceState.Down);
  });
  it('laranja (lentidão) e amarelo (instável) → SlowDown', () => {
    expect(mapIntegraNotasState(0, 0, 'rgb(241, 116, 37)', 1)).toBe(ServiceState.SlowDown);
    expect(mapIntegraNotasState(0, 0, 'rgb(255, 193, 7)', 1)).toBe(ServiceState.SlowDown);
  });
  it('preto ou tMed=-1 → Error (sem dados)', () => {
    expect(mapIntegraNotasState(0, null, 'rgb(0, 0, 0)', -1)).toBe(ServiceState.Error);
    expect(mapIntegraNotasState(1, 0, GREEN, -1)).toBe(ServiceState.Error);
  });
});

describe('IntegraNotasProvider', () => {
  it('parseia a fixture real de NF-e (27 UFs, todas operacionais)', async () => {
    const provider = new IntegraNotasProvider(async () => nfeFixture);
    const rows = await provider.fetch(DocumentType.NFe);
    expect(rows).toHaveLength(27);
    expect(rows.map((r) => r.uf)).toContain('SP');
    expect(rows.every((r) => r.state === ServiceState.Operational)).toBe(true);
  });

  it('lança quando o payload não tem dados.labels', async () => {
    const provider = new IntegraNotasProvider(async () => '{"dados":{}}');
    await expect(provider.fetch(DocumentType.NFe)).rejects.toThrow();
  });

  it('lança quando há labels/backgroundColor mas falta o array data', async () => {
    // Sem essa guarda, todas as UFs virariam Error silenciosamente (tMed=-1) e o
    // fallback do híbrido nunca dispararia.
    const payload = JSON.stringify({
      dados: { labels: ['SP', 'RJ'], backgroundColor: ['', ''] },
    });
    const provider = new IntegraNotasProvider(async () => payload);
    await expect(provider.fetch(DocumentType.NFe)).rejects.toThrow(/incompleto/);
  });

  it('lança quando data tem comprimento diferente de labels', async () => {
    const payload = JSON.stringify({
      dados: { labels: ['SP', 'RJ'], backgroundColor: ['', ''], data: [1] },
    });
    const provider = new IntegraNotasProvider(async () => payload);
    await expect(provider.fetch(DocumentType.NFe)).rejects.toThrow(/incompleto|desalinhad/);
  });

  it('lança quando backgroundColor desalinha de labels', async () => {
    const payload = JSON.stringify({
      dados: { labels: ['SP', 'RJ'], backgroundColor: [''], data: [1, 1] },
    });
    const provider = new IntegraNotasProvider(async () => payload);
    await expect(provider.fetch(DocumentType.NFe)).rejects.toThrow(/desalinhad|incompleto/);
  });

  it('lança quando normal/svc (opcionais) desalinham de labels', async () => {
    const payload = JSON.stringify({
      dados: { labels: ['SP', 'RJ'], backgroundColor: ['', ''], data: [1, 1], normal: [1] },
    });
    const provider = new IntegraNotasProvider(async () => payload);
    await expect(provider.fetch(DocumentType.NFe)).rejects.toThrow(/desalinhad|incompleto/);
  });

  it('cobre os 5 documentos suportados', () => {
    const provider = new IntegraNotasProvider(async () => nfeFixture);
    const docs = provider.supportedDocuments();
    expect(docs).toContain(DocumentType.MDFe);
    expect(docs).toContain(DocumentType.DCe);
    expect(docs).toHaveLength(5);
  });
});
