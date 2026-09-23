import { describe, it, expect } from 'vitest';
import { UF_NAME, formatLatency } from '../src/lib/labels.js';

describe('UF_NAME', () => {
  it('nomeia as 27 UFs a partir do catalog', () => {
    expect(Object.keys(UF_NAME)).toHaveLength(27);
    expect(UF_NAME.SP).toBe('São Paulo');
    expect(UF_NAME.DF).toBe('Distrito Federal');
  });
});

describe('formatLatency', () => {
  it('0 é medição legítima (resposta rápida), não "—"', () => {
    // Regressão: 91 de 135 serviços têm tMed=0; tratar como "—" escondia o
    // tempo na maioria dos cards saudáveis.
    expect(formatLatency(0)).toEqual({ value: '<1', unit: 's' });
  });

  it('só ausência de medição (negativo / não-número) vira "—"', () => {
    expect(formatLatency(-1)).toEqual({ value: '—', unit: '' });
    expect(formatLatency(NaN)).toEqual({ value: '—', unit: '' });
  });

  it('≥ 1000ms exibe em segundos', () => {
    expect(formatLatency(1000)).toEqual({ value: '1.0', unit: 's' });
    expect(formatLatency(6000)).toEqual({ value: '6.0', unit: 's' });
  });

  it('valores intermediários em ms', () => {
    expect(formatLatency(240)).toEqual({ value: '240', unit: 'ms' });
  });
});
