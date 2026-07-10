import { describe, it, expect } from 'vitest';
import {
  DocumentType,
  type HistoryFileDTO,
  type ServiceStatusDTO,
  type SourceHealthDTO,
} from '@monitor-sefaz/contracts';
import {
  previousFromHistory,
  sourceDegradedEvents,
  buildNotificationEvents,
} from '../src/notifyEvents.js';

const AT = '2026-07-10T00:00:00.000Z';

function history(series: Record<string, string[]>): HistoryFileDTO {
  const out: HistoryFileDTO = { updatedAt: AT, series: {} };
  for (const [id, states] of Object.entries(series)) {
    out.series[id] = states.map((state, i) => ({
      timestamp: `2026-07-09T0${i}:00:00.000Z`,
      state: state as never,
      cStat: null,
      latencyMs: 0,
      source: 'svrs',
    }));
  }
  return out;
}

function svc(id: string, state: ServiceStatusDTO['state']): ServiceStatusDTO {
  const [document, uf] = id.split(':');
  return {
    id,
    document: DocumentType[document as keyof typeof DocumentType],
    uf: uf!,
    authorizer: uf!,
    environment: 'production',
    state,
    cStat: null,
    xMotivo: null,
    latencyMs: 0,
    source: 'svrs',
    error: null,
    checkedAt: AT,
  };
}

describe('previousFromHistory', () => {
  it('usa o ÚLTIMO ponto de cada série como estado anterior', () => {
    const prev = previousFromHistory(history({ 'NFe:SP': ['OPERATIONAL', 'DOWN'] }));
    expect(prev).toHaveLength(1);
    expect(prev[0]).toMatchObject({ id: 'NFe:SP', uf: 'SP', document: DocumentType.NFe, state: 'DOWN' });
  });

  it('ignora ids malformados ou sem pontos', () => {
    const h: HistoryFileDTO = {
      updatedAt: AT,
      series: { 'lixo-sem-dois-pontos': [], 'XXe:SP': [] },
    };
    expect(previousFromHistory(h)).toEqual([]);
  });
});

describe('sourceDegradedEvents', () => {
  const src = (source: string, official: boolean, degraded: boolean): SourceHealthDTO => ({
    source: source as never,
    official,
    collected: degraded ? 0 : 100,
    expected: 135,
    coverage: degraded ? 0 : 0.74,
    degraded,
  });

  it('emite só para fontes OFICIAIS degradadas e NÃO isentas', () => {
    const events = sourceDegradedEvents(
      [
        src('svrs', true, true), // oficial degradada, não isenta → evento
        src('availability', true, true), // oficial degradada, MAS isenta (bloqueio de IP) → sem evento
        src('integranotas', false, true), // não-oficial → sem evento
      ],
      AT
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'SOURCE_DEGRADED', source: 'svrs' });
  });

  it('availability degradada não gera evento (fonte inalcançável conhecida)', () => {
    const events = sourceDegradedEvents([src('availability', true, true)], AT);
    expect(events).toEqual([]);
  });

  it('sem sources retorna vazio', () => {
    expect(sourceDegradedEvents(undefined, AT)).toEqual([]);
  });
});

describe('buildNotificationEvents', () => {
  it('combina transições de estado e fontes degradadas', () => {
    const h = history({ 'NFe:SP': ['OPERATIONAL'], 'NFe:RJ': ['OPERATIONAL'] });
    const services = [svc('NFe:SP', 'DOWN'), svc('NFe:RJ', 'OPERATIONAL')];
    const sources: SourceHealthDTO[] = [
      { source: 'svrs', official: true, collected: 3, expected: 135, coverage: 0.02, degraded: true },
    ];
    const events = buildNotificationEvents(h, services, sources, AT);
    const types = events.map((e) => e.type);
    expect(types).toContain('SERVICE_DOWN'); // SP: OPERATIONAL → DOWN
    expect(types).toContain('SOURCE_DEGRADED'); // svrs degradada (não isenta)
    expect(types).not.toContain('SERVICE_RECOVERED'); // RJ não mudou
  });

  it('primeira coleta (history vazio) não gera transições', () => {
    const events = buildNotificationEvents(
      { updatedAt: AT, series: {} },
      [svc('NFe:SP', 'DOWN')],
      undefined,
      AT
    );
    expect(events).toEqual([]); // baseline
  });
});
