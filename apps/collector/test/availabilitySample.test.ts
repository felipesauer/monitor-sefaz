import { describe, it, expect } from 'vitest';
import { ServiceState, type SvrsAuthorizerStatus } from '@monitor-sefaz/core';
import {
  formatSummary,
  isDivergent,
  isFetchOk,
  layoutHash,
  summarizePage,
  toPageSample,
  type FetchOutcome,
} from '../src/availabilitySample.js';

const ws = (operation: string, state = ServiceState.Operational) => ({
  operation,
  state,
  cStat: 252,
  lastCheckTime: '16:27:16',
});

const svrs = (
  webServices: ReturnType<typeof ws>[],
  state = ServiceState.Operational
): SvrsAuthorizerStatus[] => [
  { authorizer: 'SVRS', state, cStat: 252, lastCheckTime: '16:27:16', webServices },
];

const FOUR = [
  ws('WS Autorizacao Sincrona'),
  ws('WS Consulta Situacao'),
  ws('WS Eventos'),
  ws('WS Status'),
];
const ok: FetchOutcome = { httpStatus: 200, latencyMs: 800, bytes: 27_000, error: null };
const at = (i: number) => new Date(Date.UTC(2026, 10, 10, 12, i * 5)).toISOString();

describe('layoutHash', () => {
  it('é o mesmo quando só os estados mudam', () => {
    const down = FOUR.map((w) => ({ ...w, state: ServiceState.Down }));
    expect(layoutHash(svrs(FOUR))).toBe(layoutHash(svrs(down, ServiceState.Down)));
  });

  it('muda quando o SVRS acrescenta uma operação', () => {
    expect(layoutHash(svrs(FOUR))).not.toBe(layoutHash(svrs([...FOUR, ws('WS Inutilizacao')])));
  });

  it('é nulo quando o parser não leu nada', () => {
    expect(layoutHash([])).toBeNull();
  });
});

describe('isFetchOk e isDivergent', () => {
  it('só conta como ok com HTTP 200 e página legível', () => {
    expect(isFetchOk(toPageSample('Nfcom', at(0), ok, svrs(FOUR)))).toBe(true);
    expect(isFetchOk(toPageSample('Nfcom', at(0), ok, []))).toBe(false);
    expect(isFetchOk(toPageSample('Nfcom', at(0), { ...ok, httpStatus: 503 }, []))).toBe(false);
  });

  it('diverge quando outra operação cai e o WS Status segue no ar', () => {
    const eventsDown = [FOUR[0]!, FOUR[1]!, ws('WS Eventos', ServiceState.Down), FOUR[3]!];
    const sample = toPageSample('Nfcom', at(0), ok, svrs(eventsDown, ServiceState.Down));
    expect(isDivergent(sample)).toBe(true);
    expect(isDivergent(toPageSample('Nfcom', at(0), ok, svrs(FOUR)))).toBe(false);
  });
});

describe('summarizePage', () => {
  const eventsDown = svrs(
    [FOUR[0]!, FOUR[1]!, ws('WS Eventos', ServiceState.Down), FOUR[3]!],
    ServiceState.Down
  );

  it('atende o critério com todas as leituras ok e layout estável', () => {
    const samples = Array.from({ length: 100 }, (_, i) =>
      toPageSample('Nf3e', at(i), ok, svrs(FOUR))
    );
    const s = summarizePage('Nf3e', samples);
    expect(s).toMatchObject({
      samples: 100,
      fetchOk: 100,
      layouts: 1,
      layoutChanges: 0,
      meetsCriterion: true,
    });
    expect(s.medianLatencyMs).toBe(800);
  });

  const withFailures = (failures: number) =>
    Array.from({ length: 100 }, (_, i) =>
      i < failures
        ? toPageSample('Nf3e', at(i), { ...ok, httpStatus: null, error: 'ETIMEDOUT' }, [])
        : toPageSample('Nf3e', at(i), ok, svrs(FOUR))
    );

  it('aprova com 98% de leituras ok (ADR-21)', () => {
    const s = summarizePage('Nf3e', withFailures(2));
    expect(s.fetchOkRatio).toBeCloseTo(0.98);
    expect(s.meetsCriterion).toBe(true);
  });

  it('reprova abaixo de 98% de leituras ok', () => {
    const s = summarizePage('Nf3e', withFailures(3));
    expect(s.fetchOkRatio).toBeCloseTo(0.97);
    expect(s.meetsCriterion).toBe(false);
  });

  it('reprova quando o layout muda no meio da amostragem', () => {
    const samples = [
      toPageSample('Nf3e', at(0), ok, svrs(FOUR)),
      toPageSample('Nf3e', at(1), ok, svrs([...FOUR, ws('WS Inutilizacao')])),
    ];
    const s = summarizePage('Nf3e', samples);
    expect(s).toMatchObject({ layouts: 2, layoutChanges: 1, meetsCriterion: false });
  });

  it('conta episódios só a partir de duas amostras divergentes seguidas', () => {
    const pattern = [
      eventsDown,
      svrs(FOUR),
      eventsDown,
      eventsDown,
      eventsDown,
      svrs(FOUR),
      eventsDown,
      eventsDown,
    ];
    const samples = pattern.map((a, i) => toPageSample('Nfcom', at(i), ok, a));
    const s = summarizePage('Nfcom', samples);
    expect(s.divergentSamples).toBe(6);
    expect(s.divergenceEpisodes).toBe(2);
  });
});

describe('formatSummary', () => {
  it('marca cada página com o resultado do critério', () => {
    const good = summarizePage('Nf3e', [toPageSample('Nf3e', at(0), ok, svrs(FOUR))]);
    const bad = summarizePage('Nfgas', [toPageSample('Nfgas', at(0), ok, [])]);
    const md = formatSummary([good, bad]);
    expect(md).toContain('| Nf3e | 1 | 1 (100.0%) | 800 ms | 1 | 0 | 0 | 0 | ✅ |');
    expect(md).toContain('| Nfgas | 1 | 0 (0.0%) | — | 0 | 0 | 0 | 0 | ❌ |');
  });
});
