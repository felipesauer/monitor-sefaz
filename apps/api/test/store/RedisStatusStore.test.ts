import { describe, it, expect, beforeEach } from 'vitest';
import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import type { ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { RedisStatusStore } from '../../src/store/RedisStatusStore.js';

function makeService(overrides: Partial<ServiceStatusDTO> = {}): ServiceStatusDTO {
  return {
    id: 'NFe:SP',
    document: 'NFe' as ServiceStatusDTO['document'],
    uf: 'SP',
    authorizer: 'SP',
    environment: 'production',
    state: 'OPERATIONAL',
    cStat: 107,
    xMotivo: 'Servico em Operacao',
    latencyMs: 120,
    error: null,
    checkedAt: '2026-06-02T11:00:00.000Z',
    ...overrides,
  };
}

describe('RedisStatusStore', () => {
  let redis: Redis;

  beforeEach(() => {
    redis = new RedisMock() as unknown as Redis;
  });

  it('salva e lê o snapshot atual', async () => {
    const store = new RedisStatusStore(redis, () => 1_000_000);
    await store.saveSnapshot('production', [makeService(), makeService({ id: 'NFe:MG', uf: 'MG' })]);

    const snapshot = await store.getSnapshot('production');
    expect(snapshot).toHaveLength(2);
    expect(await store.getService('production', 'NFe:SP')).toMatchObject({ uf: 'SP' });
  });

  it('acumula histórico e poda pontos fora da janela de retenção', async () => {
    let now = 0;
    const retention = 1000; // 1s de janela
    const store = new RedisStatusStore(redis, () => now, retention);

    now = 0;
    await store.saveSnapshot('production', [makeService({ state: 'DOWN' })]);
    now = 500;
    await store.saveSnapshot('production', [makeService({ state: 'OPERATIONAL' })]);
    now = 2000; // ponto t=0 já saiu da janela (cutoff = 1000)
    await store.saveSnapshot('production', [makeService({ state: 'SLOWDOWN' })]);

    const history = await store.getHistory('production', 'NFe:SP', '1h');
    const states = history.map((p) => p.state);
    expect(states).not.toContain('DOWN'); // podado
    expect(states).toContain('OPERATIONAL');
    expect(states).toContain('SLOWDOWN');
  });

  it('não falha ao salvar snapshot vazio', async () => {
    const store = new RedisStatusStore(redis);
    await expect(store.saveSnapshot('production', [])).resolves.toBeUndefined();
  });
});
