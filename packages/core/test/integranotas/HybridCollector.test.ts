import { describe, it, expect, vi } from 'vitest';
import { DocumentType } from '@monitor-sefaz/catalog';
import { HybridCollector, type StatusCollectorLike } from '../../src/integranotas/HybridCollector.js';
import { ServiceState, type CollectedStatus } from '../../src/index.js';

function fakeStatus(n: number): CollectedStatus[] {
  return Array.from({ length: n }, (_, i) => ({
    document: DocumentType.NFe,
    uf: 'SP' as const,
    authorizer: 'SP' as const,
    state: ServiceState.Operational,
    cStat: 107,
    latencyMs: 0,
  })).map((s, i) => ({ ...s, uf: (['SP', 'MG', 'RS'][i % 3] ?? 'SP') as never }));
}

describe('HybridCollector', () => {
  it('usa a fonte primária quando ela traz dados suficientes', async () => {
    const primary: StatusCollectorLike = { collect: vi.fn(async () => fakeStatus(120)) };
    const fallback: StatusCollectorLike = { collect: vi.fn(async () => fakeStatus(50)) };
    const out = await new HybridCollector(primary, fallback, 100).collect();
    expect(out).toHaveLength(120);
    expect(fallback.collect).not.toHaveBeenCalled();
  });

  it('cai para o fallback quando a primária traz poucos dados', async () => {
    const primary: StatusCollectorLike = { collect: vi.fn(async () => fakeStatus(10)) };
    const fallback: StatusCollectorLike = { collect: vi.fn(async () => fakeStatus(120)) };
    const out = await new HybridCollector(primary, fallback, 100).collect();
    expect(out).toHaveLength(120);
    expect(fallback.collect).toHaveBeenCalledOnce();
  });

  it('cai para o fallback quando a primária lança', async () => {
    const primary: StatusCollectorLike = {
      collect: vi.fn(async () => {
        throw new Error('IntegraNotas fora do ar');
      }),
    };
    const fallback: StatusCollectorLike = { collect: vi.fn(async () => fakeStatus(120)) };
    const out = await new HybridCollector(primary, fallback, 100).collect();
    expect(out).toHaveLength(120);
    expect(fallback.collect).toHaveBeenCalledOnce();
  });
});
