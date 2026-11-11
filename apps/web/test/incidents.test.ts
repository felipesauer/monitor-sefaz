import { describe, it, expect } from 'vitest';
import type { HistoryPointDTO } from '@monitor-sefaz/contracts';
import { deriveIncidents } from '../src/lib/incidents.js';
import { inSvrsMaintenance, nextSvrsMaintenance } from '../src/lib/maintenance.js';
import { dayKey, formatDuration, formatTime } from '../src/lib/time.js';

const pt = (iso: string, state: HistoryPointDTO['state']): HistoryPointDTO => ({
  timestamp: iso,
  state,
  cStat: null,
  latencyMs: 100,
});

describe('deriveIncidents', () => {
  const svrs = () => 'SVRS';

  it('junta numa ocorrência só os estados do mesmo autorizador que caíram juntos', () => {
    const down = (uf: string) => ({
      [`NFe:${uf}`]: [
        pt('2026-11-11T10:00:00Z', 'OPERATIONAL'),
        pt('2026-11-11T10:05:00Z', 'DOWN'),
        pt('2026-11-11T10:10:00Z', 'DOWN'),
        pt('2026-11-11T10:15:00Z', 'OPERATIONAL'),
      ],
    });
    const incidents = deriveIncidents({ ...down('AC'), ...down('AL') }, svrs, 0);
    expect(incidents).toHaveLength(1);
    expect(incidents[0]).toMatchObject({
      document: 'NFe',
      authorizer: 'SVRS',
      ufs: ['AC', 'AL'],
      state: 'DOWN',
      start: Date.parse('2026-11-11T10:05:00Z'),
      end: Date.parse('2026-11-11T10:15:00Z'),
    });
  });

  it('deixa em aberto a ocorrência que ainda não voltou e ignora "sem dados"', () => {
    const incidents = deriveIncidents(
      {
        'CTe:SP': [pt('2026-11-11T10:00:00Z', 'SLOWDOWN')],
        'MDFe:SP': [pt('2026-11-11T10:00:00Z', 'ERROR'), pt('2026-11-11T10:05:00Z', 'ERROR')],
      },
      () => 'SP',
      0
    );
    expect(incidents).toHaveLength(1);
    expect(incidents[0]).toMatchObject({ document: 'CTe', state: 'SLOWDOWN', end: null });
  });

  it('não conta o que ficou antes da janela', () => {
    const incidents = deriveIncidents(
      { 'NFe:SP': [pt('2026-11-10T10:00:00Z', 'DOWN'), pt('2026-11-10T10:05:00Z', 'OPERATIONAL')] },
      () => 'SP',
      Date.parse('2026-11-11T00:00:00Z')
    );
    expect(incidents).toEqual([]);
  });
});

describe('manutenção do SVRS', () => {
  it('reconhece domingo das 7h às 9h de Brasília (10h–12h UTC)', () => {
    expect(inSvrsMaintenance(Date.parse('2026-11-15T10:30:00Z'))).toBe(true);
    expect(inSvrsMaintenance(Date.parse('2026-11-15T12:00:00Z'))).toBe(false);
    expect(inSvrsMaintenance(Date.parse('2026-11-14T10:30:00Z'))).toBe(false);
  });

  it('acha a próxima janela, e a atual quando ela já começou', () => {
    const sunday7 = Date.parse('2026-11-15T10:00:00Z');
    expect(nextSvrsMaintenance(Date.parse('2026-11-11T03:00:00Z'))).toBe(sunday7);
    expect(nextSvrsMaintenance(Date.parse('2026-11-15T11:00:00Z'))).toBe(sunday7);
    expect(nextSvrsMaintenance(Date.parse('2026-11-15T12:30:00Z'))).toBe(sunday7 + 7 * 86_400_000);
  });
});

describe('horários', () => {
  it('formata no horário de Brasília', () => {
    expect(formatTime(Date.parse('2026-11-11T03:02:00Z'))).toBe('00:02');
    expect(dayKey(Date.parse('2026-11-11T02:00:00Z'))).toBe('2026-11-10');
    expect(formatDuration(25 * 60_000)).toBe('25 min');
    expect(formatDuration(130 * 60_000)).toBe('2 h 10 min');
  });
});
