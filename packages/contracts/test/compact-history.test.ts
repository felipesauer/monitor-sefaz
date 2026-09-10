import { describe, it, expect } from 'vitest';
import {
  appendObservations,
  compactHistorySchema,
  emptyCompactHistory,
  expandAllSeries,
  expandCompactHistory,
  LATENCY_BUCKET_MS,
  pruneCompactHistory,
  type HistoryObservation,
} from '../src/compact-history.js';

const STEP = 5 * 60 * 1000;
const T0 = Date.parse('2026-09-01T00:00:00.000Z');

function obs(state: string, latencyMs = 100, cStat: number | null = 107): HistoryObservation[] {
  return [{ id: 'NFe:SP', state: state as HistoryObservation['state'], cStat, latencyMs }];
}

/** Aplica N rodadas seguidas na cadência nominal. */
function runRounds(states: string[], startMs = T0) {
  let h = emptyCompactHistory(new Date(startMs).toISOString(), STEP);
  states.forEach((state, i) => {
    h = appendObservations(h, obs(state), startMs + i * STEP);
  });
  return h;
}

describe('appendObservations', () => {
  it('cria um segmento na primeira observação', () => {
    const h = appendObservations(
      emptyCompactHistory(new Date(T0).toISOString(), STEP),
      obs('OPERATIONAL'),
      T0
    );
    expect(h.segments['NFe:SP']).toEqual([[T0, 'OPERATIONAL', 107]]);
  });

  it('NÃO cria segmento novo enquanto o estado não muda', () => {
    const h = runRounds(['OPERATIONAL', 'OPERATIONAL', 'OPERATIONAL', 'OPERATIONAL']);
    // É esta compressão que viabiliza a coleta de 5 em 5 minutos num só blob.
    expect(h.segments['NFe:SP']).toHaveLength(1);
  });

  it('cria segmento novo quando o estado muda, no instante da mudança', () => {
    const h = runRounds(['OPERATIONAL', 'OPERATIONAL', 'DOWN']);
    expect(h.segments['NFe:SP']).toHaveLength(2);
    expect(h.segments['NFe:SP']![1]).toEqual([T0 + 2 * STEP, 'DOWN', 107]);
  });

  it('cria segmento novo quando só o cStat muda', () => {
    let h = appendObservations(
      emptyCompactHistory(new Date(T0).toISOString(), STEP),
      obs('OPERATIONAL', 100, 107),
      T0
    );
    h = appendObservations(h, obs('OPERATIONAL', 100, 108), T0 + STEP);
    expect(h.segments['NFe:SP']).toHaveLength(2);
  });

  it('agrega latência no bucket da hora corrente', () => {
    let h = appendObservations(
      emptyCompactHistory(new Date(T0).toISOString(), STEP),
      obs('OPERATIONAL', 100),
      T0
    );
    h = appendObservations(h, obs('OPERATIONAL', 200), T0 + STEP);
    expect(h.latency['NFe:SP']).toEqual([[T0, 150]]);
  });

  it('abre bucket novo quando vira a hora', () => {
    let h = appendObservations(
      emptyCompactHistory(new Date(T0).toISOString(), STEP),
      obs('OPERATIONAL', 100),
      T0
    );
    h = appendObservations(h, obs('OPERATIONAL', 300), T0 + LATENCY_BUCKET_MS);
    expect(h.latency['NFe:SP']).toEqual([
      [T0, 100],
      [T0 + LATENCY_BUCKET_MS, 300],
    ]);
  });

  it('avança updatedAt para o instante da rodada', () => {
    const h = runRounds(['OPERATIONAL', 'OPERATIONAL']);
    expect(h.updatedAt).toBe(new Date(T0 + STEP).toISOString());
  });

  it('produz uma estrutura válida contra o schema', () => {
    expect(compactHistorySchema.safeParse(runRounds(['OPERATIONAL', 'DOWN'])).success).toBe(true);
  });
});

describe('pruneCompactHistory', () => {
  it('descarta segmentos e buckets fora da janela', () => {
    const h = runRounds(['OPERATIONAL', 'DOWN', 'OPERATIONAL'], T0);
    const pruned = pruneCompactHistory(h, STEP); // janela de 1 passo
    expect(pruned.segments['NFe:SP']!.every((s) => s[0] >= T0 + STEP)).toBe(true);
  });

  it('PRESERVA o último segmento anterior ao corte, deslocado para a borda', () => {
    // Um serviço estável há dias tem seu único segmento muito antes do corte.
    // Se ele sumisse, o gráfico começaria "sem dados" em vez de "no ar".
    let h = appendObservations(
      emptyCompactHistory(new Date(T0).toISOString(), STEP),
      obs('OPERATIONAL'),
      T0
    );
    h = appendObservations(h, obs('OPERATIONAL'), T0 + 100 * STEP);
    const pruned = pruneCompactHistory(h, 10 * STEP);
    const cutoff = Date.parse(h.updatedAt) - 10 * STEP;
    expect(pruned.segments['NFe:SP']).toEqual([[cutoff, 'OPERATIONAL', 107]]);
  });

  it('avança from para a borda da janela', () => {
    const h = runRounds(['OPERATIONAL', 'OPERATIONAL', 'OPERATIONAL']);
    const pruned = pruneCompactHistory(h, STEP);
    expect(Date.parse(pruned.from)).toBe(Date.parse(h.updatedAt) - STEP);
  });
});

describe('expandCompactHistory', () => {
  it('expande numa grade regular, repetindo o estado vigente', () => {
    const h = runRounds(['OPERATIONAL', 'OPERATIONAL', 'OPERATIONAL']);
    const points = expandCompactHistory(h, 'NFe:SP');
    expect(points).toHaveLength(3);
    expect(points.every((p) => p.state === 'OPERATIONAL')).toBe(true);
  });

  it('reconstrói a fração de tempo fora do ar', () => {
    // 2 rodadas no ar, 2 fora, 2 no ar → 1/3 do tempo indisponível.
    const h = runRounds([
      'OPERATIONAL',
      'OPERATIONAL',
      'DOWN',
      'DOWN',
      'OPERATIONAL',
      'OPERATIONAL',
    ]);
    const points = expandCompactHistory(h, 'NFe:SP');
    const down = points.filter((p) => p.state === 'DOWN').length;
    expect(points).toHaveLength(6);
    expect(down).toBe(2);
  });

  it('respeita a resolução pedida', () => {
    const h = runRounds(Array(24).fill('OPERATIONAL'));
    const grosso = expandCompactHistory(h, 'NFe:SP', { stepMs: LATENCY_BUCKET_MS });
    // 24 rodadas de 5 min = ~2h de janela → 3 pontos na grade horária.
    expect(grosso.length).toBeLessThan(5);
  });

  it('recorta pela janela pedida', () => {
    const h = runRounds(Array(12).fill('OPERATIONAL'));
    const to = Date.parse(h.updatedAt);
    const points = expandCompactHistory(h, 'NFe:SP', { fromMs: to - 2 * STEP, toMs: to });
    expect(points).toHaveLength(3);
  });

  it('devolve vazio para um id desconhecido', () => {
    expect(expandCompactHistory(runRounds(['OPERATIONAL']), 'NFe:XX')).toEqual([]);
  });

  it('atribui a latência do bucket correspondente', () => {
    const h = runRounds(['OPERATIONAL', 'OPERATIONAL']);
    expect(expandCompactHistory(h, 'NFe:SP')[0]!.latencyMs).toBe(100);
  });
});

describe('expandAllSeries', () => {
  it('expande todas as séries presentes', () => {
    let h = emptyCompactHistory(new Date(T0).toISOString(), STEP);
    h = appendObservations(
      h,
      [
        { id: 'NFe:SP', state: 'OPERATIONAL', cStat: 107, latencyMs: 10 },
        { id: 'CTe:RS', state: 'DOWN', cStat: 109, latencyMs: 20 },
      ],
      T0
    );
    const all = expandAllSeries(h);
    expect(Object.keys(all).sort()).toEqual(['CTe:RS', 'NFe:SP']);
  });
});
