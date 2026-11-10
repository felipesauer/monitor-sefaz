import { describe, it, expect } from 'vitest';
import type { HistoryFileDTO, HistoryPointDTO } from '@monitor-sefaz/contracts';
import { capHistoryBytes } from '../src/historyCap.js';

const point = (minute: number): HistoryPointDTO => ({
  timestamp: new Date(Date.UTC(2026, 10, 10, 0, minute)).toISOString(),
  state: 'OPERATIONAL',
  cStat: 107,
  latencyMs: 300,
  source: 'svrs',
});

/** 3 séries com um ponto a cada 5 min ao longo de `rounds` rodadas. */
function history(rounds: number): HistoryFileDTO {
  const series: HistoryFileDTO['series'] = {};
  for (const id of ['NFe:SP', 'CTe:MG', 'MDFe:RS']) {
    series[id] = Array.from({ length: rounds }, (_, i) => point(i * 5));
  }
  return { updatedAt: point((rounds - 1) * 5).timestamp, series };
}

const bytes = (h: HistoryFileDTO): number => Buffer.byteLength(JSON.stringify(h));

describe('capHistoryBytes', () => {
  it('devolve o histórico intacto quando ele já cabe', () => {
    const h = history(10);
    expect(capHistoryBytes(h, bytes(h))).toBe(h);
  });

  it('corta os pontos mais antigos até caber, guardando os mais recentes', () => {
    const h = history(100);
    const max = Math.floor(bytes(h) / 2);
    const capped = capHistoryBytes(h, max);

    expect(bytes(capped)).toBeLessThanOrEqual(max);
    const kept = capped.series['NFe:SP']!;
    expect(kept.at(-1)).toEqual(h.series['NFe:SP']!.at(-1));
    expect(kept.length).toBeGreaterThan(40);
    expect(kept.length).toBeLessThan(100);
  });

  it('corta o mínimo: um ponto a mais já passaria do teto', () => {
    const h = history(50);
    const capped = capHistoryBytes(h, Math.floor(bytes(h) * 0.6));
    const firstKept = capped.series['NFe:SP']![0]!.timestamp;
    const all = h.series['NFe:SP']!;
    const previous = all[all.findIndex((p) => p.timestamp === firstKept) - 1]!.timestamp;
    const withOneMore = {
      ...h,
      series: Object.fromEntries(
        Object.entries(h.series).map(([id, ps]) => [id, ps.filter((p) => p.timestamp >= previous)])
      ),
    };
    expect(bytes(withOneMore)).toBeGreaterThan(Math.floor(bytes(h) * 0.6));
  });

  it('descarta séries que ficam vazias', () => {
    const h = history(20);
    h.series['BPe:AC'] = [point(0)];
    const capped = capHistoryBytes(h, Math.floor(bytes(h) / 2));
    expect(capped.series['BPe:AC']).toBeUndefined();
  });
});
