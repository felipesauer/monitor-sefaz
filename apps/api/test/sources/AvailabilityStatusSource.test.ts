import { describe, it, expect } from 'vitest';
import { DocumentType } from '@monitor-sefaz/catalog';
import { ServiceState, type AvailabilityRow } from '@monitor-sefaz/core';
import { AvailabilityStatusSource } from '../../src/sources/AvailabilityStatusSource.js';

/** Provider fake que devolve status fixos por documento. */
const fakeProvider = {
  supportedDocuments: () => [DocumentType.NFe],
  fetch: async (): Promise<AvailabilityRow[]> => [
    { authorizer: 'SP', state: ServiceState.Operational, tMedSeconds: 1 },
    { authorizer: 'SVRS', state: ServiceState.Down, tMedSeconds: null },
    { authorizer: 'SVAN', state: ServiceState.Operational, tMedSeconds: null },
  ],
};

describe('AvailabilityStatusSource', () => {
  const source = new AvailabilityStatusSource(
    fakeProvider as never,
    undefined,
    () => 0
  );

  it('retorna vazio para homologação (página oficial é só produção)', async () => {
    expect(await source.collect('homologacao')).toEqual([]);
  });

  it('expande o status por-autorizador para os serviços por-UF', async () => {
    const services = await source.collect('producao');

    // SP é autorizador próprio → herda o estado de SP (operacional)
    const sp = services.find((s) => s.id === 'NFe:SP');
    expect(sp?.state).toBe('OPERATIONAL');
    expect(sp?.cStat).toBe(107);

    // AC delega a SVRS → herda o estado de SVRS (down)
    const ac = services.find((s) => s.id === 'NFe:AC');
    expect(ac?.authorizer).toBe('SVRS');
    expect(ac?.state).toBe('DOWN');

    // MA delega a SVAN → operacional
    const ma = services.find((s) => s.id === 'NFe:MA');
    expect(ma?.authorizer).toBe('SVAN');
    expect(ma?.state).toBe('OPERATIONAL');
  });

  it('converte tMed (s) em latência aproximada (ms)', async () => {
    const services = await source.collect('producao');
    expect(services.find((s) => s.id === 'NFe:SP')?.latencyMs).toBe(1000);
  });
});
