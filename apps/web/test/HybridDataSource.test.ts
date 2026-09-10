import { describe, it, expect, vi } from 'vitest';
import type { HistoryPointDTO } from '@monitor-sefaz/contracts';
import { HybridDataSource } from '../src/api/HybridDataSource.js';
import type { DataSource } from '../src/api/DataSource.js';

function point(iso: string, latencyMs = 1): HistoryPointDTO {
  return { timestamp: iso, state: 'OPERATIONAL', cStat: 107, latencyMs };
}

/** DataSource mínimo; cada teste sobrescreve só o que exercita. */
function source(overrides: Partial<DataSource> = {}): DataSource {
  return {
    getStatus: vi.fn(),
    getSummary: vi.fn(),
    getHistory: vi.fn(),
    getHistorySeries: vi.fn(async () => ({})),
    getTechnicalNotes: vi.fn(),
    ...overrides,
  } as DataSource;
}

const ESTATICO = [point('2026-09-01T00:00:00.000Z'), point('2026-09-05T00:00:00.000Z')];
const AO_VIVO = [point('2026-09-08T00:00:00.000Z'), point('2026-09-08T00:05:00.000Z')];

describe('HybridDataSource.getHistory', () => {
  it('junta o estático antigo com o ao vivo recente', async () => {
    const hybrid = new HybridDataSource(
      source({ getHistory: vi.fn(async () => ({ id: 'NFe:SP', period: '24h', points: AO_VIVO })) }),
      source({ getHistory: vi.fn(async () => ({ id: 'NFe:SP', period: '24h', points: ESTATICO })) })
    );
    const result = await hybrid.getHistory('NFe:SP', '24h');
    expect(result.points.map((p) => p.timestamp)).toEqual([
      '2026-09-01T00:00:00.000Z',
      '2026-09-05T00:00:00.000Z',
      '2026-09-08T00:00:00.000Z',
      '2026-09-08T00:05:00.000Z',
    ]);
  });

  it('descarta o estático que se sobrepõe à janela ao vivo', async () => {
    // Onde as duas cobrem o mesmo instante, a ao vivo é mais densa e ganha.
    const sobreposto = [point('2026-09-08T00:02:00.000Z')];
    const hybrid = new HybridDataSource(
      source({ getHistory: vi.fn(async () => ({ id: 'x', period: '24h', points: AO_VIVO })) }),
      source({ getHistory: vi.fn(async () => ({ id: 'x', period: '24h', points: sobreposto })) })
    );
    const result = await hybrid.getHistory('x', '24h');
    expect(result.points).toHaveLength(2);
  });

  it('usa só o estático quando a fonte ao vivo falha', async () => {
    const hybrid = new HybridDataSource(
      source({
        getHistory: vi.fn(async () => {
          throw new Error('worker fora');
        }),
      }),
      source({ getHistory: vi.fn(async () => ({ id: 'x', period: '24h', points: ESTATICO })) })
    );
    expect((await hybrid.getHistory('x', '24h')).points).toEqual(ESTATICO);
  });

  it('usa só o estático quando o KV ainda está vazio', async () => {
    // Cenário logo após um deploy do Worker: a janela ao vivo não existe.
    const hybrid = new HybridDataSource(
      source({ getHistory: vi.fn(async () => ({ id: 'x', period: '24h', points: [] })) }),
      source({ getHistory: vi.fn(async () => ({ id: 'x', period: '24h', points: ESTATICO })) })
    );
    expect((await hybrid.getHistory('x', '24h')).points).toEqual(ESTATICO);
  });
});

describe('HybridDataSource.getHistorySeries', () => {
  it('mescla série a série e preserva as que só existem no estático', async () => {
    const hybrid = new HybridDataSource(
      source({ getHistorySeries: vi.fn(async () => ({ 'NFe:SP': AO_VIVO })) }),
      source({
        getHistorySeries: vi.fn(async () => ({ 'NFe:SP': ESTATICO, 'CTe:RS': ESTATICO })),
      })
    );
    const series = await hybrid.getHistorySeries();
    expect(series['NFe:SP']).toHaveLength(4);
    expect(series['CTe:RS']).toEqual(ESTATICO);
  });

  it('cai para o estático inteiro quando a fonte ao vivo falha', async () => {
    const hybrid = new HybridDataSource(
      source({
        getHistorySeries: vi.fn(async () => {
          throw new Error('worker fora');
        }),
      }),
      source({ getHistorySeries: vi.fn(async () => ({ 'NFe:SP': ESTATICO })) })
    );
    expect(await hybrid.getHistorySeries()).toEqual({ 'NFe:SP': ESTATICO });
  });
});
