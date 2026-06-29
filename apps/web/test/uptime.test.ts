import { describe, it, expect } from 'vitest';
import type { HistoryPointDTO } from '@monitor-sefaz/contracts';
import { computeUptime } from '../src/lib/uptime.js';

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
    const points = [
      pt('2026-06-28T00:00:00Z', 'OPERATIONAL'),
      pt('2026-06-28T03:00:00Z', 'DOWN'),
    ];
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
});
