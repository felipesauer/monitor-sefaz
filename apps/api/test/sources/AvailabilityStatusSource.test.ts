import { describe, it, expect } from 'vitest';
import { DocumentType, ServiceState, type AvailabilityCollector, type CollectedStatus } from '@monitor-sefaz/core';
import { AvailabilityStatusSource } from '../../src/sources/AvailabilityStatusSource.js';

const sample: CollectedStatus[] = [
  {
    document: DocumentType.NFe,
    uf: 'SP',
    authorizer: 'SP',
    state: ServiceState.Operational,
    cStat: 107,
    latencyMs: 1000,
  },
];

const fakeCollector = { collect: async () => sample } as unknown as AvailabilityCollector;

describe('AvailabilityStatusSource', () => {
  const source = new AvailabilityStatusSource(fakeCollector, () => 0);

  it('retorna vazio para homologação (página oficial é só produção)', async () => {
    expect(await source.collect('homologation')).toEqual([]);
  });

  it('adapta o status coletado para o DTO da API', async () => {
    const services = await source.collect('production');
    expect(services).toHaveLength(1);
    expect(services[0]).toMatchObject({
      id: 'NFe:SP',
      document: 'NFe',
      uf: 'SP',
      authorizer: 'SP',
      environment: 'production',
      state: 'OPERATIONAL',
      cStat: 107,
      latencyMs: 1000,
    });
  });
});
