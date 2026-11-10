import { describe, it, expect, vi } from 'vitest';
import {
  COMPACT_HISTORY_KEY,
  CompactHistoryStore,
  type StatusSnapshotDTO,
} from '@monitor-sefaz/contracts';
import { kvRestStore, toObservations } from '../src/kvHistory.js';

const config = { accountId: 'acc', namespaceId: 'ns', token: 'tok' };
const valueUrl =
  'https://api.cloudflare.com/client/v4/accounts/acc/storage/kv/namespaces/ns/values/history%3Av1';

/** KV falso atrás da API REST: guarda o último PUT e o devolve no GET. */
function fakeApi(initial: string | null = null) {
  let stored = initial;
  const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      stored = init.body as string;
      return new Response('{"success":true}', { status: 200 });
    }
    return stored === null
      ? new Response('{"success":false}', { status: 404 })
      : new Response(stored, { status: 200 });
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls: fetchImpl.mock.calls };
}

const snapshot = (generatedAt: string, state: 'OPERATIONAL' | 'DOWN'): StatusSnapshotDTO => ({
  environment: 'production',
  generatedAt,
  services: [
    {
      id: 'NFe:SP',
      document: 'NFe',
      uf: 'SP',
      authorizer: 'SP',
      environment: 'production',
      state,
      cStat: 107,
      xMotivo: null,
      latencyMs: 250,
      error: null,
      checkedAt: generatedAt,
    },
  ] as StatusSnapshotDTO['services'],
});

describe('kvRestStore', () => {
  it('lê e grava na chave do histórico, com o token e a chave codificada', async () => {
    const { fetchImpl, calls } = fakeApi();
    const store = kvRestStore(config, fetchImpl);

    expect(await store.get(COMPACT_HISTORY_KEY)).toBeNull();
    await store.put(COMPACT_HISTORY_KEY, '{"v":1}');
    expect(await store.get(COMPACT_HISTORY_KEY)).toBe('{"v":1}');

    const [url, init] = calls[1] as unknown as [string, RequestInit];
    expect(url).toBe(valueUrl);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('lança quando a API recusa, em vez de tratar como histórico vazio', async () => {
    const fetchImpl = (async () => new Response('', { status: 403 })) as unknown as typeof fetch;
    await expect(kvRestStore(config, fetchImpl).get(COMPACT_HISTORY_KEY)).rejects.toThrow(
      'HTTP 403'
    );
  });
});

describe('gravação de rodadas pelo Actions', () => {
  it('acumula as rodadas coletadas no mesmo formato que o Worker lê', async () => {
    const { fetchImpl } = fakeApi();
    const history = new CompactHistoryStore(kvRestStore(config, fetchImpl));
    const first = snapshot('2026-11-10T21:00:00.000Z', 'OPERATIONAL');
    const second = snapshot('2026-11-10T21:05:00.000Z', 'DOWN');

    await history.append(toObservations(first), Date.parse(first.generatedAt));
    const after = await history.append(toObservations(second), Date.parse(second.generatedAt));

    expect(after.segments['NFe:SP']!.map((s) => s[1])).toEqual(['OPERATIONAL', 'DOWN']);
    expect(after.updatedAt).toBe(second.generatedAt);
  });
});
