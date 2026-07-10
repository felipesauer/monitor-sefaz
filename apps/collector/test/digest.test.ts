import { describe, it, expect } from 'vitest';
import type { SummaryDTO } from '@monitor-sefaz/contracts';
import { buildDigestEvent, parseDigestHour } from '../src/digest.js';

const summary: SummaryDTO = {
  environment: 'production',
  generatedAt: '2026-07-10T08:00:00.000Z',
  total: 135,
  operational: 130,
  failing: 5,
  availability: 96.3,
  avgLatencyMs: 200,
  byDocument: [],
  byAuthorizer: [],
  sources: [
    { source: 'svrs', official: true, collected: 112, expected: 135, coverage: 0.83, degraded: false },
    { source: 'availability', official: true, collected: 0, expected: 135, coverage: 0, degraded: true },
  ],
};

describe('parseDigestHour', () => {
  it('aceita 0–23; rejeita vazio, fora do range e não-inteiro', () => {
    expect(parseDigestHour('8')).toBe(8);
    expect(parseDigestHour('0')).toBe(0);
    expect(parseDigestHour('23')).toBe(23);
    expect(parseDigestHour(undefined)).toBeNull();
    expect(parseDigestHour('')).toBeNull();
    expect(parseDigestHour('24')).toBeNull();
    expect(parseDigestHour('-1')).toBeNull();
    expect(parseDigestHour('8.5')).toBeNull();
    expect(parseDigestHour('abc')).toBeNull();
  });
});

describe('buildDigestEvent (idempotente por dia)', () => {
  it('emite na hora-alvo quando ainda não houve digest hoje', () => {
    const ev = buildDigestEvent(summary, 8, new Date('2026-07-10T08:17:00.000Z'), null);
    expect(ev).not.toBeNull();
    expect(ev!.type).toBe('DAILY_DIGEST');
    expect(ev!.payload).toMatchObject({
      total: 135,
      operational: 130,
      availability: 96.3,
      degradedSources: ['availability'],
    });
  });

  it('emite mesmo APÓS a hora-alvo (cron pulou a hora exata) se não enviou hoje', () => {
    // hora 11 > alvo 8, lastDigestDate de ontem → ainda deve sair (resolve o "pulo")
    const ev = buildDigestEvent(summary, 8, new Date('2026-07-10T11:00:00.000Z'), '2026-07-09');
    expect(ev).not.toBeNull();
  });

  it('NÃO reemite no mesmo dia (resolve a duplicação)', () => {
    const ev = buildDigestEvent(summary, 8, new Date('2026-07-10T09:00:00.000Z'), '2026-07-10');
    expect(ev).toBeNull();
  });

  it('não emite ANTES da hora-alvo', () => {
    expect(buildDigestEvent(summary, 8, new Date('2026-07-10T07:59:00.000Z'), null)).toBeNull();
  });

  it('não emite quando desligado (targetHour null)', () => {
    expect(buildDigestEvent(summary, null, new Date('2026-07-10T08:00:00.000Z'), null)).toBeNull();
  });

  it('degradedSources vazio quando não há sources', () => {
    const clean = { ...summary, sources: undefined };
    const ev = buildDigestEvent(clean, 8, new Date('2026-07-10T08:00:00.000Z'), null);
    expect(ev!.payload!.degradedSources).toEqual([]);
  });
});
