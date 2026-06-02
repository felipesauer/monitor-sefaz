import { describe, it, expect, vi } from 'vitest';
import { DocumentType, Environment } from '@monitor-sefaz/catalog';
import { ServiceState, type ServiceTarget, type StatusResult } from '@monitor-sefaz/core';
import type { BatchChecker, AuthorizerRegistry } from '@monitor-sefaz/core';
import type { ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { Scheduler } from '../../src/scheduler/Scheduler.js';
import type { StatusStore } from '../../src/store/StatusStore.js';

const target: ServiceTarget = {
  document: DocumentType.NFe,
  uf: 'SP',
  authorizer: 'SP',
  environment: Environment.Production,
  cUF: 35,
  url: 'https://example.test',
};

function result(state: ServiceState): StatusResult {
  return {
    target,
    state,
    cStat: state === ServiceState.Operational ? 107 : 109,
    xMotivo: null,
    latencyMs: 10,
    dhRecbto: null,
    tMed: null,
    httpStatus: 200,
    error: null,
    checkedAt: new Date(0),
  };
}

function makeStore() {
  return {
    saveSnapshot: vi.fn(async () => undefined),
    getSnapshot: vi.fn(async () => []),
    getService: vi.fn(async () => null),
    getHistory: vi.fn(async () => []),
    publishUpdates: vi.fn(async () => undefined),
  } satisfies StatusStore as StatusStore & {
    publishUpdates: ReturnType<typeof vi.fn>;
    saveSnapshot: ReturnType<typeof vi.fn>;
  };
}

const registry: AuthorizerRegistry = {
  resolve: () => target,
  listAll: () => [target],
};

const logger = { info: () => {}, error: () => {} };

describe('Scheduler', () => {
  it('persiste snapshot e não publica mudança na primeira rodada', async () => {
    const store = makeStore();
    const batch = { checkAll: vi.fn(async () => [result(ServiceState.Operational)]) } as unknown as BatchChecker;
    const scheduler = new Scheduler(batch, registry, store, {
      cronExpression: '* * * * *',
      environments: ['producao'],
    }, logger);

    await scheduler.runOnce('producao');

    expect(store.saveSnapshot).toHaveBeenCalledOnce();
    // primeira observação não conta como transição
    expect(store.publishUpdates).toHaveBeenCalledWith('producao', []);
  });

  it('publica apenas serviços que mudaram de estado entre rodadas', async () => {
    const store = makeStore();
    const states = [ServiceState.Operational, ServiceState.Down];
    let call = 0;
    const batch = {
      checkAll: vi.fn(async () => [result(states[call++]!)]),
    } as unknown as BatchChecker;
    const scheduler = new Scheduler(batch, registry, store, {
      cronExpression: '* * * * *',
      environments: ['producao'],
    }, logger);

    await scheduler.runOnce('producao'); // OPERATIONAL (baseline)
    await scheduler.runOnce('producao'); // DOWN (transição)

    const lastCall = store.publishUpdates.mock.calls.at(-1);
    const changed = lastCall?.[1] as ServiceStatusDTO[];
    expect(changed).toHaveLength(1);
    expect(changed[0]?.state).toBe('DOWN');
  });
});
