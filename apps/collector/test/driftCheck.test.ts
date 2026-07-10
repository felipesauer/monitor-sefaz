import { describe, it, expect } from 'vitest';
import type { SourceHealth } from '@monitor-sefaz/core';
import { evaluateDrift } from '../src/driftCheck.js';

const src = (
  source: string,
  official: boolean,
  degraded: boolean
): SourceHealth => ({
  source,
  official,
  collected: degraded ? 3 : 130,
  expected: 135,
  coverage: degraded ? 0.022 : 0.963,
  degraded,
});

describe('evaluateDrift', () => {
  it('sem drift quando todas as fontes oficiais estão acima do piso', () => {
    const r = evaluateDrift([
      src('svrs', true, false),
      src('availability', true, false),
      src('integranotas', false, false),
    ]);
    expect(r.drift).toBe(false);
    expect(r.degradedOfficial).toEqual([]);
  });

  it('drift quando uma fonte OFICIAL está degradada', () => {
    const r = evaluateDrift([
      src('svrs', true, false),
      src('availability', true, true), // Receita mudou o HTML → degradada
      src('integranotas', false, false),
    ]);
    expect(r.drift).toBe(true);
    expect(r.degradedOfficial).toEqual(['availability']);
  });

  it('terceiro (não-oficial) degradado NÃO conta como drift', () => {
    const r = evaluateDrift([
      src('svrs', true, false),
      src('availability', true, false),
      src('integranotas', false, true), // não-oficial caiu — irrelevante para o guard
    ]);
    expect(r.drift).toBe(false);
    expect(r.degradedOfficial).toEqual([]);
  });

  it('inclui uma linha legível por fonte, marcando as degradadas', () => {
    const r = evaluateDrift([src('svrs', true, false), src('availability', true, true)]);
    expect(r.lines).toHaveLength(2);
    expect(r.lines[0]).toContain('[oficial] svrs');
    expect(r.lines[1]).toContain('DEGRADADA');
  });
});
