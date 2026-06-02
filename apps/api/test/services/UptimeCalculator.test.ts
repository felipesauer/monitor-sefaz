import { describe, it, expect } from 'vitest';
import type { HistoryPointDTO, ServiceStateValue } from '@monitor-sefaz/contracts';
import { UptimeCalculator } from '../../src/services/UptimeCalculator.js';

function point(state: ServiceStateValue, latencyMs = 100, ts = '2026-06-02T11:00:00.000Z'): HistoryPointDTO {
  return { timestamp: ts, state, cStat: state === 'OPERATIONAL' ? 107 : 109, latencyMs };
}

describe('UptimeCalculator', () => {
  const calc = new UptimeCalculator();

  describe('computeUptime', () => {
    it('calcula percentual e latência média dos operacionais', () => {
      const stats = calc.computeUptime([
        point('OPERATIONAL', 100),
        point('OPERATIONAL', 200),
        point('DOWN', 0),
        point('OPERATIONAL', 300),
      ]);
      expect(stats.totalChecks).toBe(4);
      expect(stats.operationalChecks).toBe(3);
      expect(stats.uptime).toBe(75);
      expect(stats.avgLatencyMs).toBe(200);
    });

    it('retorna uptime 0 e latência nula para série vazia', () => {
      const stats = calc.computeUptime([]);
      expect(stats.uptime).toBe(0);
      expect(stats.avgLatencyMs).toBeNull();
    });
  });

  describe('deriveIncidents', () => {
    it('abre incidente ao cair e fecha ao voltar a operar', () => {
      const incidents = calc.deriveIncidents('NFe:SP', [
        point('OPERATIONAL', 1, '2026-06-02T11:00:00.000Z'),
        point('DOWN', 0, '2026-06-02T11:05:00.000Z'),
        point('ERROR', 0, '2026-06-02T11:10:00.000Z'),
        point('OPERATIONAL', 1, '2026-06-02T11:15:00.000Z'),
      ]);
      expect(incidents).toHaveLength(1);
      expect(incidents[0]?.startedAt).toBe('2026-06-02T11:05:00.000Z');
      expect(incidents[0]?.endedAt).toBe('2026-06-02T11:15:00.000Z');
      expect(incidents[0]?.worstState).toBe('DOWN'); // pior que ERROR
    });

    it('mantém incidente aberto (endedAt nulo) quando ainda não recuperou', () => {
      const incidents = calc.deriveIncidents('NFe:SP', [
        point('OPERATIONAL', 1),
        point('DOWN', 0),
      ]);
      expect(incidents).toHaveLength(1);
      expect(incidents[0]?.endedAt).toBeNull();
    });

    it('não gera incidente quando sempre operacional', () => {
      const incidents = calc.deriveIncidents('NFe:SP', [point('OPERATIONAL'), point('OPERATIONAL')]);
      expect(incidents).toHaveLength(0);
    });
  });
});
