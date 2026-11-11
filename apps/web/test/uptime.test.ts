import { describe, it, expect } from 'vitest';
import type { HistoryPointDTO } from '@monitor-sefaz/contracts';
import { bucketTimeline, computeUptime } from '../src/lib/uptime.js';

function pt(timestamp: string, state: HistoryPointDTO['state'], latencyMs = 0): HistoryPointDTO {
  return { timestamp, state, cStat: state === 'OPERATIONAL' ? 107 : null, latencyMs };
}

describe('computeUptime', () => {
  it('conta CONTINGENCY como no ar (alinhado à API e ao badge "no ar")', () => {
    const points = [
      pt('2026-06-28T00:00:00Z', 'OPERATIONAL'),
      pt('2026-06-28T03:00:00Z', 'CONTINGENCY'),
      pt('2026-06-28T06:00:00Z', 'OPERATIONAL'),
    ];
    // todos no ar → 100%, não 66.7% (o bug contava só OPERATIONAL)
    expect(computeUptime(points, '24h').uptime).toBe(100);
  });

  it('conta DOWN/ERROR como queda', () => {
    const points = [pt('2026-06-28T00:00:00Z', 'OPERATIONAL'), pt('2026-06-28T03:00:00Z', 'DOWN')];
    expect(computeUptime(points, '24h').uptime).toBe(50);
  });

  it('retorna uptime null quando não há pontos', () => {
    expect(computeUptime([], '24h').uptime).toBeNull();
  });

  it('não reporta cobertura cheia com um único ponto numa janela longa', () => {
    const stats = computeUptime([pt('2026-06-28T00:00:00Z', 'OPERATIONAL')], '72h');
    // com 1 ponto não dá para afirmar cobertura — deve sinalizar baixa cobertura
    expect(stats.lowCoverage).toBe(true);
  });

  it('sinaliza baixa cobertura com um único ponto na janela de 6h', () => {
    const stats = computeUptime([pt('2026-06-28T00:00:00Z', 'OPERATIONAL')], '6h');
    expect(stats.expectedPoints).toBe(72);
    expect(stats.lowCoverage).toBe(true);
  });

  it('dá cobertura cheia na janela de 6h com uma leitura a cada 5 minutos', () => {
    const start = Date.parse('2026-06-28T00:00:00Z');
    const points = Array.from({ length: 72 }, (_, i) =>
      pt(new Date(start + i * 5 * 60 * 1000).toISOString(), 'OPERATIONAL')
    );
    const stats = computeUptime(points, '6h');
    expect(stats.coverage).toBe(100);
    expect(stats.lowCoverage).toBe(false);
  });
});

describe('bucketTimeline', () => {
  const end = Date.parse('2026-11-11T06:00:00Z');
  const sixHours = 6 * 60 * 60 * 1000;

  it('divide a janela em faixas iguais com o pior estado de cada uma', () => {
    const buckets = bucketTimeline(
      [pt('2026-11-11T00:05:00Z', 'OPERATIONAL'), pt('2026-11-11T00:10:00Z', 'DOWN')],
      end,
      sixHours,
      6
    );
    expect(buckets).toHaveLength(6);
    expect(buckets[0]).toMatchObject({ state: 'DOWN', points: 2 });
  });

  it('deixa vazia a faixa sem leitura, em vez de esticar a vizinha', () => {
    const buckets = bucketTimeline([pt('2026-11-11T05:30:00Z', 'OPERATIONAL')], end, sixHours, 6);
    expect(buckets.slice(0, 5).every((b) => b.state === null)).toBe(true);
    expect(buckets[5]!.state).toBe('OPERATIONAL');
  });

  it('ignora leituras fora da janela', () => {
    const buckets = bucketTimeline([pt('2026-11-10T20:00:00Z', 'DOWN')], end, sixHours, 6);
    expect(buckets.every((b) => b.points === 0)).toBe(true);
  });
});
