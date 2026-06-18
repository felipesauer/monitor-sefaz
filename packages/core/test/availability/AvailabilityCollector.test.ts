import { describe, it, expect } from 'vitest';
import { DocumentType } from '@monitor-sefaz/catalog';
import { AvailabilityCollector } from '../../src/availability/AvailabilityCollector.js';
import { ServiceState } from '../../src/domain/types.js';
import type { AvailabilityRow } from '../../src/availability/AvailabilityParser.js';

/** Provider fake: NF-e com SP operacional, SVRS down, SVAN operacional. */
const fakeProvider = {
  supportedDocuments: () => [DocumentType.NFe],
  fetch: async (): Promise<AvailabilityRow[]> => [
    { authorizer: 'SP', state: ServiceState.Operational, tMedSeconds: null },
    { authorizer: 'SVRS', state: ServiceState.Down, tMedSeconds: null },
    { authorizer: 'SVAN', state: ServiceState.Operational, tMedSeconds: null },
  ],
};

/** Relógio fake: avança 50ms a cada leitura → mede 50ms de "fetch". */
function fakeClock(): () => number {
  let t = 0;
  return () => {
    const v = t;
    t += 50;
    return v;
  };
}

describe('AvailabilityCollector', () => {
  it('expande o status por-autorizador para os serviços por-UF', async () => {
    const collector = new AvailabilityCollector(fakeProvider as never, undefined, fakeClock());
    const collected = await collector.collect();

    // SP é autorizador próprio → operacional
    const sp = collected.find((s) => s.document === DocumentType.NFe && s.uf === 'SP');
    expect(sp?.state).toBe(ServiceState.Operational);
    expect(sp?.cStat).toBe(107);

    // AC delega a SVRS → down (cStat 109, não null — regressão do bug de captura)
    const ac = collected.find((s) => s.document === DocumentType.NFe && s.uf === 'AC');
    expect(ac?.authorizer).toBe('SVRS');
    expect(ac?.state).toBe(ServiceState.Down);
    expect(ac?.cStat).toBe(109);

    // MA delega a SVAN → operacional
    const ma = collected.find((s) => s.document === DocumentType.NFe && s.uf === 'MA');
    expect(ma?.authorizer).toBe('SVAN');
    expect(ma?.state).toBe(ServiceState.Operational);
  });

  it('mapeia o cStat correto para cada estado (107/108/109)', async () => {
    const provider = {
      supportedDocuments: () => [DocumentType.NFe],
      fetch: async (): Promise<AvailabilityRow[]> => [
        { authorizer: 'SP', state: ServiceState.Operational, tMedSeconds: null },
        { authorizer: 'MG', state: ServiceState.SlowDown, tMedSeconds: null },
        { authorizer: 'PE', state: ServiceState.Down, tMedSeconds: null },
      ],
    };
    const collected = await new AvailabilityCollector(
      provider as never,
      undefined,
      fakeClock()
    ).collect();
    expect(collected.find((s) => s.uf === 'SP')?.cStat).toBe(107); // OPERATIONAL
    expect(collected.find((s) => s.uf === 'MG')?.cStat).toBe(108); // SLOWDOWN
    expect(collected.find((s) => s.uf === 'PE')?.cStat).toBe(109); // DOWN
  });

  it('reporta a latência medida do fetch (tempo de resposta da SEFAZ)', async () => {
    const collector = new AvailabilityCollector(fakeProvider as never, undefined, fakeClock());
    const collected = await collector.collect();
    const sp = collected.find((s) => s.uf === 'SP');
    expect(sp?.latencyMs).toBe(50);
  });

  it('deriva MDF-e e DC-e do estado do SVRS (centralizados)', async () => {
    const collector = new AvailabilityCollector(fakeProvider as never, undefined, fakeClock());
    const collected = await collector.collect();
    const mdfe = collected.filter((s) => s.document === DocumentType.MDFe);
    const dce = collected.filter((s) => s.document === DocumentType.DCe);
    expect(mdfe).toHaveLength(27);
    expect(dce).toHaveLength(27);
    expect(mdfe.every((s) => s.authorizer === 'SVRS' && s.state === ServiceState.Down)).toBe(true);
    expect(dce.every((s) => s.authorizer === 'SVRS' && s.state === ServiceState.Down)).toBe(true);
  });
});
