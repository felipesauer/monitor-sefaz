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

describe('buildDigestEvent', () => {
  it('emite DAILY_DIGEST quando a hora UTC bate a hora-alvo', () => {
    const ev = buildDigestEvent(summary, 8, new Date('2026-07-10T08:17:00.000Z'));
    expect(ev).not.toBeNull();
    expect(ev!.type).toBe('DAILY_DIGEST');
    expect(ev!.payload).toMatchObject({
      total: 135,
      operational: 130,
      failing: 5,
      availability: 96.3,
      degradedSources: ['availability'],
    });
  });

  it('não emite fora da hora-alvo', () => {
    expect(buildDigestEvent(summary, 8, new Date('2026-07-10T09:00:00.000Z'))).toBeNull();
  });

  it('não emite quando desligado (targetHour null)', () => {
    expect(buildDigestEvent(summary, null, new Date('2026-07-10T08:00:00.000Z'))).toBeNull();
  });

  it('degradedSources vazio quando não há sources ou nenhuma degradada', () => {
    const clean = { ...summary, sources: undefined };
    const ev = buildDigestEvent(clean, 8, new Date('2026-07-10T08:00:00.000Z'));
    expect(ev!.payload!.degradedSources).toEqual([]);
  });
});
