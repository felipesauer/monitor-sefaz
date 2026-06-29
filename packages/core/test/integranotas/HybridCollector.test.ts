import { describe, it, expect, vi } from 'vitest';
import { DocumentType, type UF } from '@monitor-sefaz/catalog';
import { HybridCollector, type StatusCollectorLike } from '../../src/integranotas/HybridCollector.js';
import { ServiceState, type CollectedStatus, type StatusSource } from '../../src/index.js';

// 27 UFs reais → chaves document:uf distintas, para o merge não colapsar.
const UFS: UF[] = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

/** Gera n status únicos por (document:uf), com a `source` indicada. */
function fakeStatus(n: number, source: StatusSource): CollectedStatus[] {
  const docs = [
    DocumentType.NFe, DocumentType.NFCe, DocumentType.CTe, DocumentType.MDFe, DocumentType.DCe,
  ];
  return Array.from({ length: n }, (_, i) => ({
    document: docs[Math.floor(i / UFS.length) % docs.length]!,
    uf: UFS[i % UFS.length]!,
    authorizer: 'SVRS' as const,
    state: ServiceState.Operational,
    cStat: 107,
    latencyMs: 0,
    source,
  }));
}

describe('HybridCollector', () => {
  it('usa a fonte primária quando ela traz dados suficientes', async () => {
    const primary: StatusCollectorLike = { collect: vi.fn(async () => fakeStatus(120, 'integranotas')) };
    const fallback: StatusCollectorLike = { collect: vi.fn(async () => fakeStatus(50, 'availability')) };
    const out = await new HybridCollector(primary, fallback, 100).collect();
    expect(out).toHaveLength(120);
    expect(fallback.collect).not.toHaveBeenCalled();
  });

  it('mescla: primário parcial completa as lacunas com o fallback', async () => {
    // primário traz só 10 (1ª década de chaves), fallback traz 120.
    const primary: StatusCollectorLike = { collect: vi.fn(async () => fakeStatus(10, 'integranotas')) };
    const fallback: StatusCollectorLike = { collect: vi.fn(async () => fakeStatus(120, 'availability')) };
    const out = await new HybridCollector(primary, fallback, 100).collect();
    // união das chaves = 120 (o fallback cobre tudo que o primário tinha + o resto)
    expect(out).toHaveLength(120);
    expect(fallback.collect).toHaveBeenCalledOnce();
    // as 10 chaves do primário mantêm a fonte primária (precedência)
    const fromPrimary = out.filter((s) => s.source === 'integranotas');
    expect(fromPrimary).toHaveLength(10);
  });

  it('cai para o fallback quando a primária lança', async () => {
    const primary: StatusCollectorLike = {
      collect: vi.fn(async () => {
        throw new Error('IntegraNotas fora do ar');
      }),
    };
    const fallback: StatusCollectorLike = { collect: vi.fn(async () => fakeStatus(120, 'availability')) };
    const out = await new HybridCollector(primary, fallback, 100).collect();
    expect(out).toHaveLength(120);
    expect(fallback.collect).toHaveBeenCalledOnce();
  });

  it('fica com o primário parcial se o fallback também falhar', async () => {
    const primary: StatusCollectorLike = { collect: vi.fn(async () => fakeStatus(10, 'integranotas')) };
    const fallback: StatusCollectorLike = {
      collect: vi.fn(async () => {
        throw new Error('scraping fora do ar');
      }),
    };
    const out = await new HybridCollector(primary, fallback, 100).collect();
    expect(out).toHaveLength(10);
  });
});
