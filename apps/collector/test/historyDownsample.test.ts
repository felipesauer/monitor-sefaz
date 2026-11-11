import { describe, it, expect } from 'vitest';
import type { HistoryFileDTO, HistoryPointDTO } from '@monitor-sefaz/contracts';
import { downsampleHistory } from '../src/historyDownsample.js';

const now = Date.parse('2026-11-11T12:00:00Z');
const pt = (
  minutesAgo: number,
  state: HistoryPointDTO['state'] = 'OPERATIONAL',
  latencyMs = 100
): HistoryPointDTO => ({
  timestamp: new Date(now - minutesAgo * 60_000).toISOString(),
  state,
  cStat: state === 'OPERATIONAL' ? 107 : null,
  latencyMs,
});
const file = (points: HistoryPointDTO[]): HistoryFileDTO => ({
  updatedAt: new Date(now).toISOString(),
  series: { 'NFe:SP': points },
});

describe('downsampleHistory', () => {
  it('mantém a última hora com a resolução cheia', () => {
    const recent = [pt(55), pt(50), pt(5)];
    expect(downsampleHistory(file(recent), now).series['NFe:SP']).toEqual(recent);
  });

  it('reduz cada hora mais antiga a um ponto, com o pior estado e a latência mediana', () => {
    // 10:00–11:00 UTC: doze leituras, uma delas fora do ar
    const hour = Array.from({ length: 12 }, (_, i) =>
      pt(120 - i * 5, i === 4 ? 'DOWN' : 'OPERATIONAL', 100 + i * 10)
    );
    const out = downsampleHistory(file(hour), now).series['NFe:SP']!;
    expect(out).toHaveLength(1);
    expect(out[0]!.state).toBe('DOWN');
    expect(out[0]!.latencyMs).toBe(155);
  });

  it('é estável: rodar de novo não muda o resultado', () => {
    const points = Array.from({ length: 48 }, (_, i) => pt(240 - i * 5));
    const once = downsampleHistory(file(points), now);
    expect(downsampleHistory(once, now)).toEqual(once);
  });

  it('cabe 7 dias de 216 serviços em menos de 5 MB', () => {
    const series: HistoryFileDTO['series'] = {};
    for (let s = 0; s < 216; s++) {
      series[`NFe:S${s}`] = Array.from({ length: 7 * 24 * 12 }, (_, i) => ({
        ...pt(i * 5),
        source: 'svrs' as const,
      }));
    }
    const out = downsampleHistory({ updatedAt: new Date(now).toISOString(), series }, now);
    const bytes = Buffer.byteLength(JSON.stringify(out));
    expect(bytes).toBeLessThan(5_000_000);
  });
});
