import { describe, it, expect } from 'vitest';
import { isUp, averageLatency } from '../src/availability.js';

describe('isUp', () => {
  it('conta OPERATIONAL e CONTINGENCY como no ar', () => {
    expect(isUp('OPERATIONAL')).toBe(true);
    expect(isUp('CONTINGENCY')).toBe(true);
  });

  it('conta SLOWDOWN, DOWN e ERROR como fora do ar', () => {
    expect(isUp('SLOWDOWN')).toBe(false);
    expect(isUp('DOWN')).toBe(false);
    expect(isUp('ERROR')).toBe(false);
  });
});

describe('averageLatency', () => {
  it('inclui medições de 0ms (tMed=0 é resposta rápida legítima, não "sem dado")', () => {
    // 91 zeros + 44 de 1000ms ≈ a distribuição real observada → ~326, não 1000.
    const lat = [...Array(91).fill(0), ...Array(44).fill(1000)];
    expect(averageLatency(lat)).toBe(326);
  });

  it('não infla a média descartando os zeros', () => {
    expect(averageLatency([0, 0, 1000])).toBe(333);
  });

  it('retorna null quando não há nenhuma medição', () => {
    expect(averageLatency([])).toBeNull();
  });

  it('ignora apenas valores negativos (sentinela de ausência)', () => {
    expect(averageLatency([-1, 1000, 1000])).toBe(1000);
  });

  it('arredonda para inteiro', () => {
    expect(averageLatency([100, 101])).toBe(101);
  });
});
