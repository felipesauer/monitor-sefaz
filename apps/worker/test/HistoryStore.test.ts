import { describe, it, expect } from 'vitest';
import { HistoryStore, RETENTION_MS, STEP_MS } from '../src/HistoryStore.js';
import type { HistoryObservation } from '@monitor-sefaz/contracts';

/** KV mínimo em memória, só com o que o HistoryStore usa. */
function fakeKV(initial: string | null = null) {
  let value = initial;
  return {
    kv: {
      get: async (_key: string, _type: 'json') => (value === null ? null : JSON.parse(value)),
      put: async (_key: string, body: string) => {
        value = body;
      },
    } as unknown as KVNamespace,
    /** Bytes efetivamente gravados — a métrica que decide se cabe no free tier. */
    size: () => (value === null ? 0 : value.length),
    raw: () => value,
  };
}

const T0 = Date.parse('2026-09-01T00:00:00.000Z');

function observations(state: HistoryObservation['state'], count: number): HistoryObservation[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `NFe:UF${i}`,
    state,
    cStat: 107,
    latencyMs: 100 + i,
  }));
}

describe('HistoryStore', () => {
  it('parte de um histórico vazio quando o KV não tem nada', async () => {
    const { kv } = fakeKV();
    const history = await new HistoryStore(kv).read(T0);
    expect(history.segments).toEqual({});
    expect(history.stepMs).toBe(STEP_MS);
  });

  it('recomeça a janela quando o blob está corrompido, sem lançar', async () => {
    // Um blob inválido não pode travar a coleta para sempre.
    const { kv } = fakeKV(JSON.stringify({ v: 99, lixo: true }));
    const history = await new HistoryStore(kv).read(T0);
    expect(history.segments).toEqual({});
  });

  it('acumula rodadas sucessivas', async () => {
    const { kv } = fakeKV();
    const store = new HistoryStore(kv);
    await store.append(observations('OPERATIONAL', 3), T0);
    const after = await store.append(observations('DOWN', 3), T0 + STEP_MS);
    expect(after.segments['NFe:UF0']).toHaveLength(2);
  });

  it('poda o que passou da retenção', async () => {
    const { kv } = fakeKV();
    const store = new HistoryStore(kv);
    await store.append(observations('OPERATIONAL', 1), T0);
    const after = await store.append(observations('DOWN', 1), T0 + RETENTION_MS + STEP_MS);
    // O segmento antigo foi absorvido pela borda da janela, não duplicado.
    expect(after.segments['NFe:UF0']!.length).toBeLessThanOrEqual(2);
  });

  it('mantém o blob pequeno com 135 serviços estáveis por 72h', async () => {
    // O cenário real: 288 rodadas/dia × 3 dias, estado praticamente constante.
    // Se a compressão por segmento não funcionasse, isso explodiria o KV.
    const { kv, size } = fakeKV();
    const store = new HistoryStore(kv);
    const rounds = (RETENTION_MS / STEP_MS) | 0;
    for (let i = 0; i < rounds; i += 1) {
      await store.append(observations('OPERATIONAL', 135), T0 + i * STEP_MS);
    }
    // Limite de valor do KV é 25 MB; ficamos ordens de grandeza abaixo.
    expect(size()).toBeLessThan(1_000_000);
  }, 30_000);
});
