import { describe, it, expect, vi } from 'vitest';
import type { EnvironmentValue, ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { Scheduler } from '../../src/scheduler/Scheduler.js';
import type { StatusStore } from '../../src/store/StatusStore.js';
import type { StatusSource } from '../../src/sources/StatusSource.js';

function service(state: ServiceStatusDTO['state']): ServiceStatusDTO {
  return {
    id: 'NFe:SP',
    document: 'NFe' as ServiceStatusDTO['document'],
    uf: 'SP',
    authorizer: 'SP',
    environment: 'producao',
    state,
    cStat: state === 'OPERATIONAL' ? 107 : 109,
    xMotivo: null,
    latencyMs: 10,
    error: null,
    checkedAt: '2026-06-02T11:00:00.000Z',
  };
}

function makeStore() {
  return {
    saveSnapshot: vi.fn(async () => undefined),
    getSnapshot: vi.fn(async () => []),
    getService: vi.fn(async () => null),
    getHistory: vi.fn(async () => []),
    publishUpdates: vi.fn(async () => undefined),
  } as unknown as StatusStore & {
    publishUpdates: ReturnType<typeof vi.fn>;
    saveSnapshot: ReturnType<typeof vi.fn>;
  };
}

function makeSource(sequence: ServiceStatusDTO['state'][]): StatusSource {
  let call = 0;
  return {
    name: 'fake',
    collect: vi.fn(async () => [service(sequence[Math.min(call++, sequence.length - 1)]!)]),
  };
}

const logger = { info: () => {}, error: () => {} };
const opts = { cronExpression: '* * * * *', environments: ['producao'] as EnvironmentValue[] };

describe('Scheduler', () => {
  it('persiste snapshot e não publica mudança na primeira rodada', async () => {
    const store = makeStore();
    const scheduler = new Scheduler(makeSource(['OPERATIONAL']), store, opts, logger);

    await scheduler.runOnce('producao');

    expect(store.saveSnapshot).toHaveBeenCalledOnce();
    expect(store.publishUpdates).toHaveBeenCalledWith('producao', []);
  });

  it('publica apenas serviços que mudaram de estado entre rodadas', async () => {
    const store = makeStore();
    const scheduler = new Scheduler(makeSource(['OPERATIONAL', 'DOWN']), store, opts, logger);

    await scheduler.runOnce('producao'); // baseline OPERATIONAL
    await scheduler.runOnce('producao'); // transição -> DOWN

    const lastCall = store.publishUpdates.mock.calls.at(-1);
    const changed = lastCall?.[1] as ServiceStatusDTO[];
    expect(changed).toHaveLength(1);
    expect(changed[0]?.state).toBe('DOWN');
  });

  it('não persiste quando a fonte retorna vazio (ex: homologação no scraping)', async () => {
    const store = makeStore();
    const source: StatusSource = { name: 'empty', collect: async () => [] };
    const scheduler = new Scheduler(source, store, opts, logger);

    await scheduler.runOnce('homologacao');
    expect(store.saveSnapshot).not.toHaveBeenCalled();
  });
});
