import { describe, expect, it } from 'vitest';
import { DocumentType, type UF } from '@monitor-sefaz/catalog';
import { ConsensusCollector } from '../../src/consensus/ConsensusCollector.js';
import { ServiceState } from '../../src/domain/types.js';
import type { CollectedStatus } from '../../src/availability/AvailabilityCollector.js';
import type { StatusCollectorLike } from '../../src/integranotas/HybridCollector.js';

function status(
  uf: UF,
  state: ServiceState,
  source: CollectedStatus['source'],
  latencyMs = 0,
  document = DocumentType.NFe
): CollectedStatus {
  return { document, uf, authorizer: uf, state, cStat: null, latencyMs, source };
}

/** Collector que devolve uma lista fixa (ou lança, se `fail`). */
function fake(rows: CollectedStatus[], fail = false): StatusCollectorLike {
  return {
    collect: async () => {
      if (fail) throw new Error('fonte caiu');
      return rows;
    },
  };
}

describe('ConsensusCollector', () => {
  it('a fonte oficial vence o estado quando há divergência', async () => {
    const official = fake([status('SP', ServiceState.SlowDown, 'svrs')]);
    const third = fake([status('SP', ServiceState.Operational, 'integranotas')]);
    const consensus = new ConsensusCollector([
      { name: 'svrs', official: true, collector: official },
      { name: 'integranotas', official: false, collector: third },
    ]);

    const out = await consensus.collect();
    expect(out).toHaveLength(1);
    expect(out[0]!.state).toBe(ServiceState.SlowDown);
    expect(out[0]!.source).toBe('svrs');
  });

  it('a fonte não-oficial preenche serviços que a oficial não cobre', async () => {
    const official = fake([status('SP', ServiceState.Operational, 'svrs')]);
    const third = fake([
      status('SP', ServiceState.Down, 'integranotas'), // ignorado: oficial cobre SP
      status('AM', ServiceState.Operational, 'integranotas'), // usado: oficial não cobre AM
    ]);
    const consensus = new ConsensusCollector([
      { name: 'svrs', official: true, collector: official },
      { name: 'integranotas', official: false, collector: third },
    ]);

    const byUf = new Map((await consensus.collect()).map((s) => [s.uf, s]));
    expect(byUf.get('SP')!.source).toBe('svrs');
    expect(byUf.get('AM')!.source).toBe('integranotas');
    expect(byUf.size).toBe(2);
  });

  it('a primeira fonte oficial na ordem tem precedência sobre a segunda', async () => {
    const svrs = fake([status('RS', ServiceState.Down, 'svrs')]);
    const receita = fake([status('RS', ServiceState.Operational, 'availability')]);
    const consensus = new ConsensusCollector([
      { name: 'svrs', official: true, collector: svrs },
      { name: 'availability', official: true, collector: receita },
    ]);

    const out = await consensus.collect();
    expect(out[0]!.source).toBe('svrs');
    expect(out[0]!.state).toBe(ServiceState.Down);
  });

  it('herda a latência real medida quando a fonte vencedora reporta 0', async () => {
    const official = fake([status('SP', ServiceState.Operational, 'svrs', 0)]); // SVRS não mede latência
    const third = fake([status('SP', ServiceState.Operational, 'integranotas', 250)]);
    const consensus = new ConsensusCollector([
      { name: 'svrs', official: true, collector: official },
      { name: 'integranotas', official: false, collector: third },
    ]);

    const out = await consensus.collect();
    expect(out[0]!.source).toBe('svrs'); // estado é o oficial
    expect(out[0]!.latencyMs).toBe(250); // latência herdada da fonte que mediu
  });

  it('uma fonte que lança não derruba as demais', async () => {
    const broken = fake([], true);
    const ok = fake([status('SP', ServiceState.Operational, 'integranotas')]);
    const consensus = new ConsensusCollector([
      { name: 'svrs', official: true, collector: broken },
      { name: 'integranotas', official: false, collector: ok },
    ]);

    const out = await consensus.collect();
    expect(out).toHaveLength(1);
    expect(out[0]!.source).toBe('integranotas');
  });
});
